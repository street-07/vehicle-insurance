import PaymentHistory from "../models/PaymentHistory.js";

// Get history for a vehicle
export const getPaymentHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const history = await PaymentHistory.findOne({ vehicleId });
    if (!history) {
      return res.json({}); // return empty object if no history exists yet
    }
    res.json(history.historyData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update history for a vehicle
export const updatePaymentHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { historyData } = req.body;
    
    // Find and update, or create if it doesn't exist (upsert)
    const history = await PaymentHistory.findOneAndUpdate(
      { vehicleId },
      { historyData },
      { new: true, upsert: true }
    );
    
    res.json({ message: "Payment history synchronized successfully", data: history.historyData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Bulk get history for multiple vehicles (useful for Billbook loading)
export const getBulkPaymentHistory = async (req, res) => {
  try {
    const records = await PaymentHistory.find();
    // Return an object mapped by vehicleId
    const map = {};
    records.forEach(r => {
      map[r.vehicleId] = r.historyData;
    });
    res.json(map);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
