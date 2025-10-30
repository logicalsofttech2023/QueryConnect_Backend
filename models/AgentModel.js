import mongoose from "mongoose";

const agentSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    agentEmail: { type: String, unique: true, sparse: true },
    gender: { type: String },
    phone: { type: String, unique: true, sparse: true },
    sector: { type: String, default: "" },
    aadharNumber: { type: String },
    aadharFrontImage: { type: String, default: "" },
    aadharBackImage: { type: String, default: "" },
    profileImage: { type: String, default: "" },

    // OTPs
    phoneOtp: { type: String },
    phoneOtpExpiresAt: { type: Date },
    emailOtp: { type: String },
    emailOtpExpiresAt: { type: Date },

    // Verification flags
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },

    // Payment details
    paymentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    paymentDate: { type: Date },

    firebaseToken: { type: String },
    adminVerified: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Agent = mongoose.model("Agent", agentSchema);
export default Agent;
