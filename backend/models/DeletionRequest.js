import mongoose from "mongoose";

const deletionRequestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vehicles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  vehiclesData: [{ type: Object }] // store snapshot of vehicle numbers etc for easy viewing
}, { timestamps: true });

export default mongoose.model("DeletionRequest", deletionRequestSchema);
