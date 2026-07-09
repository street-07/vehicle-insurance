import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, 
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
  vehicleNumber: String,
  details: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    description: String
  }
}, { timestamps: true });

export default mongoose.model("ActivityLog", activitySchema);
