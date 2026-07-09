import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "client"], default: "client" },
  dailyApiLimit: { type: Number, default: 50 },
  apiUsedToday: { type: Number, default: 0 },
  lastApiReset: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  reported: { type: Boolean, default: false },
  parentAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

export default mongoose.model("User", userSchema);
