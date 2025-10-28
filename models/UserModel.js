import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: "Dummy",
    },
    userEmail: {
      type: String,
    },
    dob: {
      type: String,
    },
    gender: {
      type: String,
      enum:  ["Male", "Female"],
      default: "Male",
    },
    phone: {
      type: String,
      unique: true,
    },
    profileImage: {
      type: String,
      default: "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png",
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
