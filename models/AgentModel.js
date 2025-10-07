import mongoose from "mongoose";

const agentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
    },
    agentEmail: {
      type: String,
      unique: true,
    },
    gender: {
      type: String,
    },
    phone: {
      type: String,
      unique: true,
    },
    aadharNumber: {
      type: String,
    },
    aadharFrontImage: {
      type: String,
      default: "",
    },
    aadharBackImage: {
      type: String,
      default: "",
    },
    profileImage: {
      type: String,
      default: "",
    },
    otp: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    firebaseToken: {
      type: String,
    },
    wallet: {
      type: Number,
      default: 0,
    },
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
