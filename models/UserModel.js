import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
    },
    userEmail: {
      type: String,
      unique: true,
    },
    dob: {
      type: String,
    },
    gender: {
      type: String,
      enum:  ["Male", "Female"],
    },
    phone: {
      type: String,
      unique: true,
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
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
