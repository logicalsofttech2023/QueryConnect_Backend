import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import crypto from "crypto";
import Transaction from "../models/TransactionModel.js";
import { Policy, FAQ } from "../models/PolicyModel.js";
import Notification from "../models/NotificationModel.js";
import Contact from "../models/Contact.js";
import Query from "../models/QueryModel.js";

const generateJwtToken = (user) => {
  return jwt.sign({ id: user._id, phone: user.phone }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const generateSixDigitOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a random 4-digit number
};

const generateTransactionId = () => {
  const randomString = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 characters
  const formattedId = `QV${randomString.match(/.{1,2}/g).join("")}`; // PJ + split into 2-char groups
  return formattedId;
};

export const generateOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        message: "phone, is required",
        status: false,
      });
    }

    let user = await User.findOne({ phone });

    const generatedOtp = generateSixDigitOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    if (user) {
      user.otp = generatedOtp;
      user.otpExpiresAt = otpExpiresAt;
    } else {
      user = new User({
        phone,
        otp: generatedOtp,
        otpExpiresAt,
      });
    }

    await user.save();

    res.status(200).json({
      message: "OTP generated and sent successfully",
      status: true,
      otp: generatedOtp,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, firebaseToken } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: "phone, and otp are required",
        status: false,
      });
    }

    let user = await User.findOne({ phone });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", status: false });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ message: "OTP expired", status: false });
    }

    user.otpExpiresAt = "";
    user.isVerified = true;
    user.firebaseToken = firebaseToken;
    await user.save();

    let token = generateJwtToken(user);

    res.status(200).json({
      message: "OTP verified successfully",
      status: true,
      token,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        message: "phone are required",
        status: false,
      });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    const generatedOtp = generateSixDigitOtp();
    user.otp = generatedOtp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    res.status(200).json({
      message: "OTP resent successfully",
      status: true,
      otp: generatedOtp,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { fullName, userEmail, dob, gender, phone, firebaseToken } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized", status: false });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const files = req.files;
    const profileImage = files?.profileImage?.[0]?.filename;

    // Update only the fields that are provided
    if (fullName) user.fullName = fullName;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;
    if (userEmail) user.userEmail = userEmail;
    if (phone) user.phone = phone;
    if (firebaseToken) user.firebaseToken = firebaseToken;
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      status: true,
      user,
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return res.status(500).json({
      message: "Server Error",
      status: false,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await User.findById(userId).select("-otp -otpExpiresAt"); // Exclude sensitive fields
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    res
      .status(200)
      .json({ message: "User fetched successfully", status: true, data: user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getPolicyByType = async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res
        .status(400)
        .json({ message: "Policy type is required", status: false });
    }

    const policy = await Policy.findOne({ type });
    if (!policy) {
      return res
        .status(404)
        .json({ message: "Policy not found", status: false });
    }

    res
      .status(200)
      .json({ message: "Policy fetched successfully", status: true, policy });
  } catch (error) {
    console.error("Error fetching policy:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
};

export const getFAQList = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.status(200).json({ faqs, message: "FAQ fetch successfully" });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFAQByFaqId = async (req, res) => {
  try {
    const { id } = req.query;
    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.status(200).json({ faq, message: "FAQ fetch successfully" });
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const transactions = await Transaction.find({ userId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      message: "Transaction history fetched successfully",
      status: true,
      totalTransactions: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({
      message: "Server Error",
      status: false,
    });
  }
};

export const getNotificationsByUserId = async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    }); // latest first
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const file = req.file || req.files?.profileImage?.[0];
    if (!file) {
      return res
        .status(400)
        .json({ status: false, message: "No profile image uploaded" });
    }

    user.profileImage = file.filename;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Profile image updated successfully",
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error("Error updating profile image:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

export const createContact = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, message } = req.body;

    if (!firstName || !lastName || !phone || !email || !message) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const newContact = new Contact({
      firstName,
      lastName,
      phone,
      email,
      message,
    });
    await newContact.save();

    res
      .status(200)
      .json({ success: true, message: "Message submitted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: err.message });
  }
};

export const createQuery = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }
    const newQuery = new Query({ userId, description });
    await newQuery.save();

    res
      .status(200)
      .json({ message: "Query created successfully", status: true });
  } catch (error) {
    console.error("Error creating query:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addCommentInQuery = async (req, res) => {
  try {
    const { comment, queryId } = req.body;
    const query = await Query.findById(queryId);
    if (!query) {
      return res.status(404).json({ message: "Query not found" });
    }
    query.comments.push(comment);
    await query.save();
    res
      .status(200)
      .json({ message: "Comment added successfully", status: true });
  } catch (error) {
    console.error("Error in addCommentInQuery:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getQueries = async (req, res) => {
  try {
    const userId = req.user?.id;
    const queries = await Query.find({ userId }).sort({ createdAt: -1 });
    if (!queries) {
      return res
        .status(404)
        .json({ success: false, message: "No queries found" });
    }
    res.status(200).json({
      status: true,
      data: queries,
      message: "Queries fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching queries:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
