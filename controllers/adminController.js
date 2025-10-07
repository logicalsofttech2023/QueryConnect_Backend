import { Policy, FAQ } from "../models/PolicyModel.js";
import Admin from "../models/AdminModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/UserModel.js";
import {
  ContactUs,
} from "../models/WebsiteUi.js";



const generateJwtToken = (user) => {
  return jwt.sign(
    { id: user._id, phone: user.phone, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const adminSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const admin = await Admin.create({ name, email, password: hashedPassword });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email },
      token: generateJwtToken(admin),
    });
  } catch (error) {
    console.error("Admin Signup Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      message: "Admin logged in successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email },
      token: generateJwtToken(admin),
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getAdminDetail = async (req, res) => {
  try {
    const adminId = req.user.id;

    // Await the query to resolve
    const admin = await Admin.findById(adminId).select("-otp -otpExpiresAt");

    if (!admin) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    res.status(200).json({
      message: "Admin data fetched successfully",
      status: true,
      data: admin,
    });
  } catch (error) {
    console.error("Error fetching admin details:", error);
    res.status(500).json({ message: "Internal Server Error", status: false });
  }
};

export const resetAdminPassword = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { newPassword, confirmPassword } = req.body;

    if (!adminId || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Admin ID, new password, and confirm password are required",
        status: false,
      });
    }

    // Find admin by ID
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res
        .status(404)
        .json({ message: "Admin not found", status: false });
    }

    // Check if newPassword and confirmPassword match
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Passwords do not match", status: false });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
        status: false,
      });
    }

    // Hash the new password
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res
      .status(200)
      .json({ message: "Password reset successful", status: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Internal Server Error", status: false });
  }
};

export const updateAdminDetail = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { name, email } = req.body;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({
        message: "name, and email are required",
        status: false,
      });
    }

    // Find and update admin
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { name, email },
      { new: true, select: "-password -otp -otpExpiresAt" }
    );

    if (!updatedAdmin) {
      return res
        .status(400)
        .json({ message: "Admin not found", status: false });
    }

    res.status(200).json({
      message: "Admin details updated successfully",
      status: true,
      data: updatedAdmin,
    });
  } catch (error) {
    console.error("Error updating admin details:", error);
    res.status(500).json({ message: "Internal Server Error", status: false });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    let searchFilter = { role: "user", firstName: { $exists: true, $ne: "" } };
    if (search) {
      searchFilter = {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { userEmail: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      };
    }

    if (status !== undefined) {
      searchFilter.status = status === "true";
    }

    const users = await User.find(searchFilter)
      .select("-otp -otpExpiresAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(searchFilter);

    res.status(200).json({
      message: "Users fetched successfully",
      status: true,
      data: users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
};


export const policyUpdate = async (req, res) => {
  try {
    const { type, content } = req.body;
    const image = req.files?.image?.[0]?.filename || "";

    if (!type || !content) {
      return res
        .status(400)
        .json({ message: "Type and content are required", status: false });
    }

    let policy = await Policy.findOne({ type });

    if (policy) {
      policy.content = content;
      if (image) {
        policy.image = image; // update image only if new one is uploaded
      }
      await policy.save();
      return res.status(200).json({
        message: "Policy updated successfully",
        status: true,
        policy,
      });
    } else {
      policy = new Policy({
        type,
        content,
        ...(image && { image }), // set image only if exists
      });
      await policy.save();
      return res.status(200).json({
        message: "Policy created successfully",
        status: true,
        policy,
      });
    }
  } catch (error) {
    console.error("Error updating policy:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
};

export const getPolicy = async (req, res) => {
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


export const addFAQ = async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res
        .status(400)
        .json({ message: "Question and answer are required." });
    }

    const newFAQ = new FAQ({
      question,
      answer,
    });

    await newFAQ.save();

    res.status(200).json({ message: "FAQ added successfully", faq: newFAQ });
  } catch (error) {
    console.error("Error adding FAQ:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateFAQ = async (req, res) => {
  try {
    const { question, answer, isActive, id } = req.body;

    const updatedFAQ = await FAQ.findByIdAndUpdate(
      id,
      { question, answer, isActive },
      { new: true, runValidators: true }
    );

    if (!updatedFAQ) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res
      .status(200)
      .json({ message: "FAQ updated successfully", faq: updatedFAQ });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.status(200).json({ faqs, message: "FAQ fetch successfully" });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFAQById = async (req, res) => {
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

export const addOrUpdateContactUs = async (req, res) => {
  try {
    const { id, officeLocation, email, phone } = req.body;

    if (!officeLocation || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // If `id` is provided, update the existing document
    if (id) {
      const updatedContact = await ContactUs.findByIdAndUpdate(
        id,
        { officeLocation, email, phone },
        { new: true }
      );

      if (!updatedContact) {
        return res.status(404).json({
          success: false,
          message: "ContactUs not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "ContactUs updated successfully",
        data: updatedContact,
      });
    }

    // Check if a ContactUs document already exists
    const existing = await ContactUs.findOne();
    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Only one ContactUs document is allowed. Please update the existing one.",
        data: existing,
      });
    }

    // Create new ContactUs document
    const newContactUs = new ContactUs({ officeLocation, email, phone });
    await newContactUs.save();

    res.status(200).json({
      success: true,
      message: "ContactUs added successfully",
      data: newContactUs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getContactUs = async (req, res) => {
  try {
    const contactUs = await ContactUs.findOne();
    res.status(200).json({ success: true, data: contactUs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
