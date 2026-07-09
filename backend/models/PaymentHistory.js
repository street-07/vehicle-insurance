import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema({
  vehicleId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Vehicle", 
    required: true, 
    unique: true 
  },
  historyData: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  }
}, { timestamps: true });

export default mongoose.model("PaymentHistory", paymentHistorySchema);
