import Vehicle from "../models/Vehicle.js";
import DeletionRequest from "../models/DeletionRequest.js";
import { broadcastRefresh } from "../routes/syncRoutes.js";
import SystemSetting from "../models/SystemSetting.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";

const logActivity = async (req, action, vehicleId, vehicleNumber, before = {}, after = {}, description = "") => {
  if (!req.user) return;

  try {
    await ActivityLog.create({
      client: req.user._id,
      action,
      vehicleId,
      vehicleNumber,
      details: { before, after, description }
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

export const getVehicles = async (req, res) => {
  try {
    const { all } = req.query;
    let query = {};
    
    if (all === "reassign") {
      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
      const endOfToday = new Date();
      endOfToday.setHours(23,59,59,999);
      
      query.assignedTo = { $ne: null };
      query.assignedDate = { $lt: fortyFiveDaysAgo };
      query.$or = [
        { fitnessExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { taxExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { pucExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { permitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { nationalPermitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { insuranceExpiry: { $gt: new Date(0), $lte: endOfToday } }
      ];
    } else if (all !== "true") {
      // By default, show only today's vehicles (expired or expiring today)
      const endOfToday = new Date();
      endOfToday.setHours(23,59,59,999);
      
      query.$or = [
        { fitnessExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { taxExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { pucExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { permitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { nationalPermitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { insuranceExpiry: { $gt: new Date(0), $lte: endOfToday } }
      ];
    }
    
    if (req.user && req.user.role !== "admin") {
      query.assignedTo = req.user._id;
      
      if (all === "true") {
        const fortyFiveDaysAgo = new Date();
        fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
        query.$or = [
          { assignedDate: { $gte: fortyFiveDaysAgo } },
          { extraWorkUntil: { $gte: new Date() } }
        ];
      }
    }
    const vehicles = await Vehicle.find(query).sort({ vehicleNumber: 1 }).collation({ locale: "en", numericOrdering: true });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getVehicleByNumber = async (req, res) => {
  try {
    const v = await Vehicle.findOne({ vehicleNumber: req.params.number.toUpperCase() });
    if (v) res.json(v);
    else res.status(404).json({ message: "Not Found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addVehicle = async (req, res) => {
  try {
    const newV = new Vehicle({ 
      ...req.body, 
      assignedTo: req.user._id,
      assignedDate: new Date()
    });
    await newV.save();
    
    await logActivity(req, "CREATE", newV._id, newV.vehicleNumber, null, newV.toObject(), "Added new vehicle");
    
    // Trigger background check for 100 vehicles report
    import("../utils/emailService.js").then((module) => {
      module.checkAndSendVehicleReport();
    }).catch(console.error);
    
    res.status(201).json(newV);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const addBulkVehicles = async (req, res) => {
  try {
    let vehiclesData = req.body.vehicles;
    if (!vehiclesData || !Array.isArray(vehiclesData)) {
      return res.status(400).json({ message: "Invalid payload format" });
    }

    const dateFields = ["pucExpiry", "permitExpiry", "fitnessExpiry", "taxExpiry", "nationalPermitExpiry", "insuranceExpiry"];
    vehiclesData = vehiclesData.map(v => {
      const formatted = { ...v };
      dateFields.forEach(f => {
        if (formatted[f] && typeof formatted[f] === 'string') {
          const match = formatted[f].match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
          if (match) {
            let [, d, m, y] = match;
            if (y.length === 2) y = "20" + y;
            formatted[f] = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
          }
        }
      });
      return formatted;
    });

    vehiclesData = vehiclesData.map(v => ({
      ...v,
      assignedTo: req.user._id,
      assignedDate: new Date()
    }));

    const inserted = await Vehicle.insertMany(vehiclesData, { ordered: false });
    
    await logActivity(req, "BULK_CREATE", null, null, null, null, `Uploaded ${inserted.length} vehicles via Excel`);
    
    // Check for 100 vehicle threshold
    import("../utils/emailService.js").then((module) => {
      module.checkAndSendVehicleReport();
      // Send the bulk upload directly to Ronin
      module.sendBulkUploadNotification(req.user, req.body.vehicles);
    }).catch(console.error);

    res.status(201).json({ message: `Successfully inserted ${inserted.length} vehicles.`, count: inserted.length });
  } catch (err) {
    res.status(207).json({ message: "Bulk upload partially completed, ignored duplicates.", count: err.insertedDocs ? err.insertedDocs.length : 0 });
  }
};

export const searchVehicles = async (req, res) => {
  try {
    const q = req.query.q || "";
    const baseQuery = req.user && req.user.role === "admin" ? {} : { 
      assignedTo: req.user._id, 
      assignedDate: { $gte: new Date().setHours(0,0,0,0) } 
    };
    
    const results = await Vehicle.find({
      ...baseQuery,
      $or: [
        { vehicleNumber: { $regex: q, $options: "i" } },
        { mobileNumber: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } }
      ]
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const filterVehicles = async (req, res) => {
  try {
    const { field, value } = req.query;
    let query = {};
    
    if (req.user && req.user.role !== "admin") {
      query.assignedTo = req.user._id;
    }

    if (field === "newest" || field === "oldest") {
       const sortDir = field === "newest" ? -1 : 1;
       const vehicles = await Vehicle.find(query).sort({ createdAt: sortDir });
       return res.json(vehicles);
    }

    if (field === "newly_added") {
      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
      query.createdAt = { $gte: fortyFiveDaysAgo };
      
      const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });
      return res.json(vehicles);
    }

    if (field === "assignedDate" && value) {
      const startOfDay = new Date(value);
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(value);
      endOfDay.setHours(23,59,59,999);
      
      query.assignedDate = { $gte: startOfDay, $lte: endOfDay };
      
      const results = await Vehicle.find(query).sort({ vehicleNumber: 1 }).collation({ locale: "en", numericOrdering: true });
      return res.json(results);
    }

    if (!field || !value) {
      const vehicles = await Vehicle.find(query).sort({ vehicleNumber: 1 }).collation({ locale: "en", numericOrdering: true });
      return res.json(vehicles);
    }
    
    query[field] = { $regex: value, $options: "i" };
    
    const results = await Vehicle.find(query).sort({ vehicleNumber: 1 }).collation({ locale: "en", numericOrdering: true });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateVerification = async (req, res) => {
  try {
    const { field, status, calls, reason } = req.body;
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ message: "Not found" });
    
    const oldV = v.toObject();
    if (!v.verificationStatus) v.verificationStatus = {};
    v.verificationStatus[field] = { status, calls, reason };
    
    await v.save();
    
    let updates = [];
    if (status !== undefined && status !== oldV.verificationStatus?.[field]?.status) {
      updates.push(`status to "${status || 'None'}"`);
    }
    if (calls !== undefined && calls !== oldV.verificationStatus?.[field]?.calls) {
      updates.push(`calls to ${calls}`);
    }
    if (reason !== undefined && reason !== oldV.verificationStatus?.[field]?.reason) {
      updates.push(`reason to "${reason}"`);
    }
    
    let actionDesc = `Updated ${field.toUpperCase()} ` + (updates.length > 0 ? updates.join(", ") : "information");
    
    await logActivity(req, "UPDATE", v._id, v.vehicleNumber, oldV, v.toObject(), actionDesc);
    
    res.json(v);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetVerification = async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ message: "Not found" });
    
    const oldV = v.toObject();
    v.verificationStatus = {};
    await v.save();
    
    await logActivity(req, "UPDATE", v._id, v.vehicleNumber, oldV, v.toObject(), "Reset all verification statuses");
    
    res.json(v);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const oldV = await Vehicle.findById(req.params.id);
    if (!oldV) return res.status(404).json({ message: "Not found" });

    const updatedUser = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    await logActivity(req, "UPDATE", updatedUser._id, updatedUser.vehicleNumber, oldV.toObject(), updatedUser.toObject(), "Edited vehicle details");
    
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ message: "Not found" });

    if (req.user.role === "client") {
      const existing = await DeletionRequest.findOne({
        vehicles: v._id,
        status: "pending"
      });
      if (existing) {
        return res.status(400).json({ message: "A deletion request is already pending for this vehicle." });
      }

      v.deletionPending = true;
      await v.save();

      await DeletionRequest.create({
        client: req.user._id,
        vehicles: [v._id],
        vehiclesData: [{ vehicleNumber: v.vehicleNumber, _id: v._id }]
      });
      broadcastRefresh();
      return res.json({ message: "Deletion request sent to admin for approval" });
    }

    const deleted = await Vehicle.findByIdAndDelete(req.params.id);
    await logActivity(req, "DELETE", deleted._id, deleted.vehicleNumber, deleted.toObject(), null, "Deleted vehicle");

    res.json({ message: "Deleted successfully", vehicle: deleted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBulkVehicles = async (req, res) => {
  try {
    const { vehicleIds } = req.body;
    if (!vehicleIds || vehicleIds.length === 0) return res.status(400).json({ message: "No vehicles selected" });

    const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } });
    if (vehicles.length === 0) return res.status(404).json({ message: "Vehicles not found" });

    if (req.user.role === "client") {
      const pendingRequests = await DeletionRequest.find({ status: "pending" });
      const pendingVehicleIds = new Set();
      pendingRequests.forEach(r => {
        if (r.vehicles) r.vehicles.forEach(id => pendingVehicleIds.add(id.toString()));
      });

      const freshVehicles = vehicles.filter(v => !pendingVehicleIds.has(v._id.toString()));
      if (freshVehicles.length === 0) {
        return res.status(400).json({ message: "Deletion requests are already pending for all selected vehicles." });
      }

      // Mark vehicles pending deletion in DB
      await Vehicle.updateMany({ _id: { $in: freshVehicles.map(v => v._id) } }, { deletionPending: true });

      const vehiclesData = freshVehicles.map(v => ({ vehicleNumber: v.vehicleNumber, _id: v._id }));
      await DeletionRequest.create({
        client: req.user._id,
        vehicles: freshVehicles.map(v => v._id),
        vehiclesData
      });
      broadcastRefresh();
      return res.json({ message: `Deletion request for ${freshVehicles.length} vehicles sent to admin` });
    }

    // Admin deletion
    await Vehicle.deleteMany({ _id: { $in: vehicleIds } });
    
    // Log for all
    for (const v of vehicles) {
      await logActivity(req, "DELETE", v._id, v.vehicleNumber, v.toObject(), null, "Bulk deleted vehicle");
    }

    res.json({ message: `Successfully deleted ${vehicles.length} vehicles` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const checkAndIncrementClientApiLimit = async (userId, reg) => {
  const user = await User.findById(userId);
  if (!user) return;

  const today = new Date();
  today.setHours(0,0,0,0);

  const lastReset = user.lastApiReset ? new Date(user.lastApiReset) : new Date(0);
  lastReset.setHours(0,0,0,0);

  if (today.getTime() > lastReset.getTime()) {
    user.apiUsedToday = 0;
    user.lastApiReset = new Date();
  }

  if (user.apiUsedToday >= user.dailyApiLimit) {
    throw new Error(`Daily API usage limit of ${user.dailyApiLimit} calls exceeded.`);
  }

  // Enforce per-vehicle API limit of 5 per 45 days
  if (reg) {
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const vehicleApiCallCount = await ActivityLog.countDocuments({
      client: userId,
      vehicleNumber: reg.toUpperCase(),
      $or: [
        { action: "API_CALL" },
        { "details.description": { $regex: "Refreshed vehicle from Attestr API", $options: "i" } }
      ],
      createdAt: { $gte: fortyFiveDaysAgo }
    });

    if (vehicleApiCallCount >= 5) {
      throw new Error(`API calling limit for vehicle ${reg.toUpperCase()} exceeded (maximum 5 calls per 45 days).`);
    }
  }

  user.apiUsedToday += 1;
  await user.save();
};

const getAttestrDataHelper = async (reg, req) => {
  if (req && req.user && req.user.role !== "admin") {
    await checkAndIncrementClientApiLimit(req.user._id, reg);
  }

  let setting = await SystemSetting.findOne({ key: "attestrTokens" });
  if (!setting) {
    setting = await SystemSetting.create({ key: "attestrTokens", value: 100 });
  }

  if (setting.value <= 0) {
    throw new Error("Insufficient API tokens remaining. Please refill from the admin control panel.");
  }

  const API_KEY = process.env.ATTESTR_API_KEY;

  if (!API_KEY) {
     setting.value = Math.max(0, setting.value - 1);
     await setting.save();

     // Log the API call
     if (req && req.user) {
       await logActivity(req, "API_CALL", null, reg.toUpperCase(), null, null, `Called Attestr API for vehicle ${reg.toUpperCase()} (MOCKED)`);
     }

     return {
       valid: true,
       message: "RC found successfully (MOCKED - No API Key Provided)",
       data: {
         regNumber: reg.toUpperCase(),
         status: "ACTIVE",
         ownerName: "TRIAL MOCK NAME",
         vehicleModel: "HYUNDAI CRETA",
         vehicleManufacturer: "HYUNDAI MOTOR INDIA",
         fuelType: "PETROL",
         registrationDate: "2021-03-16",
         fitnessUpto: "2036-03-15",
         insuranceUpto: "2025-03-15",
         taxUpto: "2026-04-30",
         pucUpto: "2025-08-10",
         permitUpto: "2026-01-20",
         nationalPermitUpto: "2027-02-15",
         ownershipNumber: "1",
         isCommercial: false,
         isFinanced: false,
         registeredAt: "Mumbai, Maharashtra" 
       }
     };
  }

  const response = await fetch("https://api.attestr.com/api/v2/public/checkx/rc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${API_KEY}`
    },
    body: JSON.stringify({ reg })
  });

  const data = await response.json();
  if (response.status === 200) {
    setting.value = Math.max(0, setting.value - 1);
    await setting.save();

    // Log the API call
    if (req && req.user) {
      await logActivity(req, "API_CALL", null, reg.toUpperCase(), null, null, `Called Attestr API for vehicle ${reg.toUpperCase()}`);
    }

    return data;
  } else {
    throw new Error(data.message || "Attestr verification failed");
  }
};

const mapAttestrToVehicle = (vehicle, attestrResult) => {
  const data = attestrResult.data || attestrResult;
  if (!data) return;

  if (data.ownerName) vehicle.fullName = data.ownerName;
  else if (data.owner) vehicle.fullName = data.owner;

  if (data.vehicleClass) vehicle.vehicleClass = data.vehicleClass;
  
  if (data.fitnessUpto) vehicle.fitnessExpiry = new Date(data.fitnessUpto);
  else if (data.registered && data.status) {
    // Fallback if government values differ
    const d = new Date(data.registered);
    d.setFullYear(d.getFullYear() + 15);
    vehicle.fitnessExpiry = d;
  }

  if (data.taxUpto) vehicle.taxExpiry = new Date(data.taxUpto);
  if (data.pucUpto) vehicle.pucExpiry = new Date(data.pucUpto);
  if (data.permitUpto) vehicle.permitExpiry = new Date(data.permitUpto);
  if (data.nationalPermitUpto) vehicle.nationalPermitExpiry = new Date(data.nationalPermitUpto);
  if (data.insuranceUpto) vehicle.insuranceExpiry = new Date(data.insuranceUpto);
};

export const fetchAttestrData = async (req, res) => {
  const { reg } = req.body;
  if (!reg) return res.status(400).json({ message: "Registration number required" });
  try {
    const data = await getAttestrDataHelper(reg, req);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const refreshVehicleApi = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const attestrResult = await getAttestrDataHelper(vehicle.vehicleNumber, req);
    mapAttestrToVehicle(vehicle, attestrResult);
    await vehicle.save();
    
    await logActivity(req, "UPDATE", vehicle._id, vehicle.vehicleNumber, null, vehicle.toObject(), "Refreshed vehicle from Attestr API");
    broadcastRefresh();

    res.json({ message: "Vehicle refreshed successfully from Attestr API", data: vehicle });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const bulkRefreshVehiclesApi = async (req, res) => {
  try {
    const { date, view, ids } = req.body;
    let query = {};
    
    if (ids && Array.isArray(ids)) {
      query._id = { $in: ids };
    } else if (view === "reassign") {
      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
      const endOfToday = new Date();
      endOfToday.setHours(23,59,59,999);
      
      query.assignedTo = { $ne: null };
      query.assignedDate = { $lt: fortyFiveDaysAgo };
      query.$or = [
        { fitnessExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { taxExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { pucExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { permitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { nationalPermitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { insuranceExpiry: { $gt: new Date(0), $lte: endOfToday } }
      ];
    } else if (view === "false") {
      const endOfToday = new Date();
      endOfToday.setHours(23,59,59,999);
      
      query.$or = [
        { fitnessExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { taxExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { pucExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { permitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { nationalPermitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { insuranceExpiry: { $gt: new Date(0), $lte: endOfToday } }
      ];
    } else if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23,59,59,999);
      query.assignedDate = { $gte: startOfDay, $lte: endOfDay };
    }
    
    if (req.user && req.user.role !== "admin") {
      query.assignedTo = req.user._id;
      
      if (!ids && view !== "reassign" && view !== "false" && !date) {
        const fortyFiveDaysAgo = new Date();
        fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
        query.$or = [
          { assignedDate: { $gte: fortyFiveDaysAgo } },
          { extraWorkUntil: { $gte: new Date() } }
        ];
      }
    }
    const vehicles = await Vehicle.find(query);
    let successCount = 0;
    let failCount = 0;
    
    const refreshSingleVehicle = async (vehicle) => {
      const attestrResult = await getAttestrDataHelper(vehicle.vehicleNumber, req);
      mapAttestrToVehicle(vehicle, attestrResult);
      await vehicle.save();
    };

    // Concurrently process in batches of 10 to speed up API calls and saves
    const batchSize = 10;
    for (let i = 0; i < vehicles.length; i += batchSize) {
      const batch = vehicles.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(async (vehicle) => {
        try {
          await refreshSingleVehicle(vehicle);
          successCount++;
        } catch (err) {
          console.error(`Failed to refresh vehicle ${vehicle.vehicleNumber}:`, err.message);
          failCount++;
        }
      }));
    }

    if (successCount > 0) {
      broadcastRefresh();
    }

    res.json({ message: `Bulk refresh completed. Success: ${successCount}, Failures: ${failCount}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
