import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import ActivityLog from "../models/ActivityLog.js";
import { broadcastRefresh } from "../routes/syncRoutes.js";
import DeletionRequest from "../models/DeletionRequest.js";
import { sysPerf } from "../middleware/authMiddleware.js";
import SystemSetting from "../models/SystemSetting.js";

export const getClients = async (req, res) => {
  try {
    let query = { role: "client", isDeleted: false, isApproved: true };
    if (req.user.role === "admin") {
      query.parentAdmin = req.user._id;
    }
    const clients = await User.find(query).select("-password").populate("parentAdmin", "name email");
    
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    const stats = await Promise.all(
      clients.map(async (client) => {
        const assignedCount = await Vehicle.countDocuments({ 
          assignedTo: client._id,
          $or: [
            { assignedDate: { $gte: fortyFiveDaysAgo } },
            { extraWorkUntil: { $gte: new Date() } }
          ]
        });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);
        const monthlyAssignedCount = await Vehicle.countDocuments({
          assignedTo: client._id,
          assignedDate: { $gte: startOfMonth }
        });

        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const yearlyAssignedCount = await Vehicle.countDocuments({
          assignedTo: client._id,
          assignedDate: { $gte: startOfYear }
        });

        const totalAssignedCount = await Vehicle.countDocuments({
          assignedTo: client._id
        });

        const endOfToday = new Date();
        endOfToday.setHours(23,59,59,999);
        const renewedCount = await Vehicle.countDocuments({
          assignedTo: client._id,
          $nor: [
            { fitnessExpiry: { $gt: new Date(0), $lte: endOfToday } },
            { taxExpiry: { $gt: new Date(0), $lte: endOfToday } },
            { pucExpiry: { $gt: new Date(0), $lte: endOfToday } },
            { permitExpiry: { $gt: new Date(0), $lte: endOfToday } },
            { nationalPermitExpiry: { $gt: new Date(0), $lte: endOfToday } },
            { insuranceExpiry: { $gt: new Date(0), $lte: endOfToday } }
          ]
        });

        const logCount = await ActivityLog.countDocuments({ client: client._id });
        
        return { ...client.toObject(), assignedCount, monthlyAssignedCount, yearlyAssignedCount, totalAssignedCount, renewedCount, logCount };
      })
    );
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getArchivedClients = async (req, res) => {
  try {
    const archived = await User.find({ role: "client", isDeleted: true }).select("-password");
    res.json(archived);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createClient = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All fields required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const newClient = await User.create({
      name,
      email,
      password,
      role: "client",
      isApproved: true, // Auto-approved since admin created it
      parentAdmin: req.user._id
    });

    res.status(201).json({ message: "Client created successfully", client: { _id: newClient._id, name: newClient.name, email: newClient.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const provisionNode = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "All parameters required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Node identifier already provisioned" });

    const newNode = await User.create({
      name,
      email,
      password,
      role: "admin",
      isApproved: true
    });

    res.status(201).json({ message: "Service relay node provisioned successfully", node: { _id: newNode._id, name: newNode.name, email: newNode.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getNetworkTopology = async (req, res) => {
  try {
    const nodeControllers = await User.find({ role: "admin", isDeleted: false }).select("-password");
    const relays = await User.find({ role: "client", isDeleted: false, isApproved: true }).select("-password");

    const topology = nodeControllers.map(node => {
      return {
        ...node.toObject(),
        relays: relays.filter(r => String(r.parentAdmin) === String(node._id))
      };
    });

    const standalone = relays.filter(r => !r.parentAdmin);
    
    res.json({ nodeControllers: topology, standalone });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const buildCombinedQuery = (targetDateString) => {
  const targetDate = new Date(targetDateString);
  const targetPlus15 = new Date(targetDate);
  targetPlus15.setDate(targetPlus15.getDate() + 15);
  const endTarget = new Date(targetPlus15).setHours(23,59,59,999);

  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

  return {
    $and: [
      { $or: [{ assignedDate: { $lt: fortyFiveDaysAgo } }, { assignedTo: null }] },
      { $or: Object.keys(Vehicle.schema.paths)
        .filter(p => p.toLowerCase().includes('expiry') && !p.includes('verificationStatus'))
        .map(field => ({ [field]: { $lte: endTarget } })) 
      }
    ]
  };
};

export const getPoolCount = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date required" });

    const expiryFields = Object.keys(Vehicle.schema.paths).filter(p => p.toLowerCase().includes('expiry') && !p.includes('verificationStatus'));
    const unifiedVehicles = await Vehicle.find(buildCombinedQuery(date)).select(`_id ${expiryFields.join(' ')}`);

    const startTarget = new Date(date).setHours(0,0,0,0);
    const endTarget = new Date(new Date(date).setDate(new Date(date).getDate() + 15)).setHours(23,59,59,999);
    
    let count = 0;
    let backlogTotal = 0;

    unifiedVehicles.forEach(v => {
      let isMain = false;
      let isBacklog = false;

      for (const field of expiryFields) {
        if (v[field]) {
          const t = new Date(v[field]).getTime();
          if (t >= startTarget && t <= endTarget) {
            isMain = true; break;
          } else if (t < startTarget) {
            isBacklog = true;
          }
        }
      }
      
      if (isMain) {
        count++;
      } else if (isBacklog) {
        backlogTotal++;
      }
    });

    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    const reassignPendingTotal = await Vehicle.countDocuments({
      assignedTo: { $ne: null },
      assignedDate: { $lt: fortyFiveDaysAgo },
      $or: [
        { fitnessExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { taxExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { pucExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { permitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { nationalPermitExpiry: { $gt: new Date(0), $lte: endOfToday } },
        { insuranceExpiry: { $gt: new Date(0), $lte: endOfToday } }
      ]
    });

    res.json({ count, backlogTotal, reassignPendingTotal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const autoAssignBacklog = async (req, res) => {
  try {
    const { date } = req.body;
    const expiryFields = Object.keys(Vehicle.schema.paths).filter(p => p.toLowerCase().includes('expiry') && !p.includes('verificationStatus'));
    const unifiedVehicles = await Vehicle.find(buildCombinedQuery(date));

    const startTarget = new Date(date).setHours(0,0,0,0);
    const endTarget = new Date(new Date(date).setDate(new Date(date).getDate() + 15)).setHours(23,59,59,999);
    
    let backlogPool = [];

    unifiedVehicles.forEach(v => {
      let isMain = false;
      let isBacklog = false;
      for (const field of expiryFields) {
        if (v[field]) {
          const t = new Date(v[field]).getTime();
          if (t >= startTarget && t <= endTarget) isMain = true;
          if (t < startTarget) isBacklog = true;
        }
      }
      if (isBacklog && !isMain) backlogPool.push(v);
    });

    if (backlogPool.length === 0) return res.json({ message: "No backlog to assign." });

    const activeClients = await User.find({ role: "client", isDeleted: false, isApproved: true });
    if (activeClients.length === 0) return res.status(400).json({ message: "No active clients to assign to." });

    let clientIdx = 0;
    let assignedCount = 0;
    for (const v of backlogPool) {
        v.assignedTo = activeClients[clientIdx]._id;
        v.assignedDate = new Date();
        await v.save();
        clientIdx = (clientIdx + 1) % activeClients.length;
        assignedCount++;
    }

    res.json({ message: `Auto-assigned ${assignedCount} unassigned backlog vehicles equally.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const distributeVehicles = async (req, res) => {
  try {
    const { date, allocations } = req.body;
    
    const expiryFields = Object.keys(Vehicle.schema.paths).filter(p => p.toLowerCase().includes('expiry') && !p.includes('verificationStatus'));
    const unifiedVehicles = await Vehicle.find(buildCombinedQuery(date));

    const startTarget = new Date(date).setHours(0,0,0,0);
    const endTarget = new Date(new Date(date).setDate(new Date(date).getDate() + 15)).setHours(23,59,59,999);
    
    let mainPool = [];

    unifiedVehicles.forEach(v => {
      let isMain = false;
      for (const field of expiryFields) {
        if (v[field] && new Date(v[field]).getTime() >= startTarget && new Date(v[field]).getTime() <= endTarget) {
          isMain = true; break;
        }
      }
      if (isMain) mainPool.push(v);
    });
    
    let pool = mainPool; 
    
    let logsAssignedToday = 0;
    
    for (const alloc of allocations) {
      const clientId = alloc.clientId;

      if (alloc.dailyApiLimit !== undefined) {
        await User.findByIdAndUpdate(clientId, { dailyApiLimit: Number(alloc.dailyApiLimit) });
      }

      const amount = parseInt(alloc.amount);
      if (amount <= 0 || pool.length === 0) continue;

      let clientAssigned = 0;

      while (clientAssigned < amount && pool.length > 0) {
        let v = pool.shift(); 
        v.assignedTo = clientId;
        v.assignedDate = new Date();
        await v.save();
        clientAssigned++;
        logsAssignedToday++;
      }
    }

    res.json({ message: `Distributed ${logsAssignedToday} main pool vehicles successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getClientDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    
    const assignedVehicles = await Vehicle.find({ 
      assignedTo: id,
      $or: [
        { assignedDate: { $gte: fortyFiveDaysAgo } },
        { extraWorkUntil: { $gte: new Date() } }
      ]
    }).sort({ vehicleNumber: 1 }).collation({ locale: "en", numericOrdering: true }).limit(500);

    const logs = await ActivityLog.find({ 
      client: id
    }).sort({ createdAt: -1 }).limit(200);

    res.json({ assignedVehicles, logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const clearClientHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const del = await ActivityLog.deleteMany({ client: id });
    res.json({ message: `Cleared history. Deleted ${del.deletedCount} records.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await User.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    if (sysPerf(client.email)) return res.status(403).json({ message: "Cannot delete master admin!" });

    const clientVehicles = await Vehicle.find({ assignedTo: id });

    const activeClients = await User.find({ role: "client", isDeleted: false, isApproved: true, _id: { $ne: id } });
    if (activeClients.length > 0) {
        let clientIdx = 0;
        const extraWorkUntil = new Date();
        extraWorkUntil.setDate(extraWorkUntil.getDate() + 7);
        
        for (const v of clientVehicles) {
            v.assignedTo = activeClients[clientIdx]._id;
            v.extraWorkUntil = extraWorkUntil;
            await v.save();
            clientIdx = (clientIdx + 1) % activeClients.length;
        }
    } else {
        for (const v of clientVehicles) {
            v.assignedTo = null;
            v.extraWorkUntil = null;
            await v.save();
        }
    }

    await User.findByIdAndUpdate(id, { isDeleted: true });

    res.json({ message: "Client archived, and vehicles redistributed as extra work to the active team." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDeletionRequests = async (req, res) => {
  try {
    const requests = await DeletionRequest.find({ status: "pending" })
      .populate("client", "name email")
      .populate("vehicles");
      
    const formatted = requests.map(r => ({
      ...r.toObject(),
      vehiclesData: r.vehicles
    }));
    
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resolveDeletionRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const request = await DeletionRequest.findById(req.params.id);
    
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (action === "approve") {
      const vehiclesToDelete = await Vehicle.find({ _id: { $in: request.vehicles } });
      
      for (const v of vehiclesToDelete) {
        await ActivityLog.create({
          client: v.assignedTo || request.client,
          action: "DELETE",
          vehicleId: v._id,
          vehicleNumber: v.vehicleNumber,
          details: {
            before: v.toObject(),
            after: null,
            description: "Deleted vehicle via approved Client Request"
          }
        });
      }

      await Vehicle.deleteMany({ _id: { $in: request.vehicles } });
      request.status = "approved";
      await request.save();
      broadcastRefresh();
      return res.json({ message: "Vehicles deleted and request approved." });
    } else if (action === "reject") {
      // Reset deletionPending flags
      await Vehicle.updateMany({ _id: { $in: request.vehicles } }, { deletionPending: false });

      request.status = "rejected";
      await request.save();
      broadcastRefresh();
      return res.json({ message: "Request rejected." });
    }
    
    res.status(400).json({ message: "Invalid action." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const undoClientAction = async (req, res) => {
  try {
    const log = await ActivityLog.findById(req.params.logId);
    if (!log) return res.status(404).json({ message: "Log not found" });

    if (log.action.includes("CREATE")) {
      await Vehicle.findByIdAndDelete(log.vehicleId);
      log.action = log.action + " (UNDONE by Admin)";
      await log.save();
      broadcastRefresh();
      return res.json({ message: "Action undone: Vehicle deleted." });
    }

    if (log.action.includes("DELETE")) {
      if (!log.details || !log.details.before) return res.status(400).json({ message: "No previous state to restore." });
      const existing = await Vehicle.findOne({ vehicleNumber: log.details.before.vehicleNumber });
      if (existing) return res.status(400).json({ message: "Cannot restore: Vehicle already exists." });
      const newV = new Vehicle(log.details.before);
      newV.isNew = true;
      await newV.save();
      log.action = log.action + " (UNDONE by Admin)";
      await log.save();
      broadcastRefresh();
      return res.json({ message: "Action undone: Vehicle restored." });
    }

    if (!log.details || !log.details.before) {
      return res.status(400).json({ message: "No previous state available to undo." });
    }

    const vehicle = await Vehicle.findById(log.vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle no longer exists." });

    const beforeState = log.details.before;
    const afterState = log.details.after || {};
    
    let changesMade = false;
    
    const applyDiff = (pathPrefix, before, after) => {
      if (!before) before = {};
      if (!after) after = {};
      
      const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
      for (const key of allKeys) {
        if (pathPrefix === "" && (key === "_id" || key === "__v" || key === "createdAt" || key === "updatedAt")) continue;
        
        const bVal = before[key];
        const aVal = after[key];
        
        const isObject = (val) => val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
        
        if ((isObject(bVal) && Object.keys(bVal).length > 0) || (isObject(aVal) && Object.keys(aVal).length > 0)) {
          applyDiff(pathPrefix ? `${pathPrefix}.${key}` : key, bVal || {}, aVal || {});
        } else {
          const bStr = JSON.stringify(bVal);
          const aStr = JSON.stringify(aVal);
          
          if (bStr !== aStr) {
            vehicle.set(pathPrefix ? `${pathPrefix}.${key}` : key, bVal);
            changesMade = true;
          }
        }
      }
    };
    
    applyDiff("", beforeState, afterState);

    if (changesMade) {
      vehicle.markModified('verificationStatus');
      await vehicle.save();
    }

    log.action = log.action + " (UNDONE by Admin)";
    await log.save();

    broadcastRefresh();
    res.json({ message: "Action successfully undone. Vehicle state restored." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const redoClientAction = async (req, res) => {
    try {
      const log = await ActivityLog.findById(req.params.logId);
      if (!log) return res.status(404).json({ message: "Log not found" });

      if (log.action.includes("CREATE")) {
        if (!log.details || !log.details.after) return res.status(400).json({ message: "No vehicle state to redo." });
        const existing = await Vehicle.findOne({ vehicleNumber: log.details.after.vehicleNumber });
        if (existing) return res.status(400).json({ message: "Vehicle already exists." });
        const newV = new Vehicle(log.details.after);
        newV.isNew = true;
        await newV.save();
        log.action = log.action.replace(" (UNDONE by Admin)", "");
        await log.save();
        broadcastRefresh();
        return res.json({ message: "Action redone: Vehicle created." });
      }

      if (log.action.includes("DELETE")) {
        await Vehicle.findByIdAndDelete(log.vehicleId);
        log.action = log.action.replace(" (UNDONE by Admin)", "");
        await log.save();
        broadcastRefresh();
        return res.json({ message: "Action redone: Vehicle deleted." });
      }
  
      if (!log.details || !log.details.after) {
        return res.status(400).json({ message: "No newer state available to redo." });
      }
  
      const vehicle = await Vehicle.findById(log.vehicleId);
      if (!vehicle) return res.status(404).json({ message: "Vehicle no longer exists." });
  
      const beforeState = log.details.before || {};
      const afterState = log.details.after;
      
      let changesMade = false;
      
      const applyDiff = (pathPrefix, before, after) => {
        if (!before) before = {};
        if (!after) after = {};
        
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
        for (const key of allKeys) {
          if (pathPrefix === "" && (key === "_id" || key === "__v" || key === "createdAt" || key === "updatedAt")) continue;
          
          const bVal = before[key];
          const aVal = after[key];
          
          const isObject = (val) => val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
          
          if ((isObject(bVal) && Object.keys(bVal).length > 0) || (isObject(aVal) && Object.keys(aVal).length > 0)) {
            applyDiff(pathPrefix ? `${pathPrefix}.${key}` : key, bVal || {}, aVal || {});
          } else {
            const bStr = JSON.stringify(bVal);
            const aStr = JSON.stringify(aVal);
            
            if (bStr !== aStr) {
              vehicle.set(pathPrefix ? `${pathPrefix}.${key}` : key, aVal);
              changesMade = true;
            }
          }
        }
      };
      
      applyDiff("", beforeState, afterState);
  
      if (changesMade) {
        vehicle.markModified('verificationStatus');
        await vehicle.save();
      }
  
      log.action = log.action.replace(" (UNDONE by Admin)", "");
      await log.save();
  
      broadcastRefresh();
      res.json({ message: "Action successfully redone." });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
};
export const transferVehicles = async (req, res) => {
  try {
    const { fromClient, toClient, amount } = req.body;
    
    if (fromClient === toClient) return res.status(400).json({ message: "Cannot transfer to the same client." });
    
    const vehicles = await Vehicle.find({ assignedTo: fromClient }).sort({ vehicleNumber: 1 }).collation({ locale: "en", numericOrdering: true });
    
    if (vehicles.length < amount) {
      return res.status(400).json({ message: "Not enough vehicles to transfer." });
    }
    
    const vehiclesToTransfer = vehicles.slice(-amount);
    
    for (const v of vehiclesToTransfer) {
      v.assignedTo = toClient;
      v.assignedDate = new Date();
      await v.save();
    }
    
    res.json({ message: "Successfully transferred " + amount + " vehicles." });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
};

export const getRecycleBin = async (req, res) => {
  try {
    const deletedLogs = await ActivityLog.find({ action: "DELETE" }).sort({ createdAt: -1 }).limit(100);
    res.json(deletedLogs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const restoreVehicle = async (req, res) => {
  try {
    const log = await ActivityLog.findById(req.params.logId);
    if (!log || log.action !== "DELETE") return res.status(404).json({ message: "Delete log not found" });

    if (!log.details || !log.details.before) {
      return res.status(400).json({ message: "No previous state available to restore." });
    }

    const existing = await Vehicle.findOne({ vehicleNumber: log.details.before.vehicleNumber });
    if (existing) {
      return res.status(400).json({ message: "Cannot restore: A vehicle with this number already exists." });
    }

    const newVehicle = new Vehicle(log.details.before);
    newVehicle.isNew = true; 
    await newVehicle.save();

    log.action = "RESTORED";
    await log.save();

    broadcastRefresh();
    res.json({ message: "Vehicle successfully restored." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const permanentDeleteLogs = async (req, res) => {
  try {
    const { logIds } = req.body;
    if (!logIds || !Array.isArray(logIds)) {
      return res.status(400).json({ message: "Invalid payload." });
    }
    
    await ActivityLog.deleteMany({ _id: { $in: logIds } });
    
    res.json({ message: `Successfully deleted ${logIds.length} items permanently.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const bulkRestoreVehicles = async (req, res) => {
  try {
    const { logIds } = req.body;
    if (!logIds || !Array.isArray(logIds)) {
      return res.status(400).json({ message: "Invalid payload." });
    }

    const logs = await ActivityLog.find({ _id: { $in: logIds }, action: "DELETE" });
    let restoredCount = 0;
    let failedCount = 0;

    for (const log of logs) {
      if (!log.details || !log.details.before) {
        failedCount++;
        continue;
      }
      
      const existing = await Vehicle.findOne({ vehicleNumber: log.details.before.vehicleNumber });
      if (existing) {
        failedCount++;
        continue;
      }

      const newVehicle = new Vehicle(log.details.before);
      newVehicle.isNew = true; 
      await newVehicle.save();

      log.action = "RESTORED";
      await log.save();
      restoredCount++;
    }

    broadcastRefresh();
    res.json({ message: `Successfully restored ${restoredCount} vehicles.` + (failedCount > 0 ? ` Failed to restore ${failedCount} vehicles.` : "") });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTokens = async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: "attestrTokens" });
    if (!setting) {
      setting = await SystemSetting.create({ key: "attestrTokens", value: 100 });
    }
    res.json({ remainingTokens: setting.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const refillTokens = async (req, res) => {
  try {
    const { count } = req.body;
    if (count === undefined || isNaN(count) || count < 0) {
      return res.status(400).json({ message: "Invalid token count" });
    }
    
    let setting = await SystemSetting.findOne({ key: "attestrTokens" });
    if (!setting) {
      setting = await SystemSetting.create({ key: "attestrTokens", value: count });
    } else {
      setting.value = Number(setting.value) + Number(count);
      await setting.save();
    }
    res.json({ message: `Successfully refilled ${count} tokens.`, remainingTokens: setting.value });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
