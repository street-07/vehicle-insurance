import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["right", "wrong", null],
    default: null,
  },
  calls: {
    type: Number,
    default: 0,
  },
  reason: {
    type: String,
    default: "",
  }
});

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    fullName: {
      type: String,
      default: "",
    },

    vehicleClass: {
      type: String,
      default: "",
    },

    mobileNumber: {
      type: String,
      default: "",
    },

    pucExpiry: Date,
    permitExpiry: Date,
    fitnessExpiry: Date,
    taxExpiry: Date,
    nationalPermitExpiry: Date,
    insuranceExpiry: Date,
    insuranceProvider: { type: String, default: "" },

    verificationStatus: {
      fullName: verificationSchema,
      vehicleClass: verificationSchema,
      mobileNumber: verificationSchema,
      pucExpiry: verificationSchema,
      permitExpiry: verificationSchema,
      fitnessExpiry: verificationSchema,
      taxExpiry: verificationSchema,
      nationalPermitExpiry: verificationSchema,
      insuranceExpiry: verificationSchema,
    },
    
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedDate: Date,
    extraWorkUntil: Date,
    reported: { type: Boolean, default: false },
    deletionPending: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Vehicle", vehicleSchema);
