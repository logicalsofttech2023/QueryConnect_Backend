import jwt from "jsonwebtoken";
import Agent from "../models/AgentModel.js";
import crypto from "crypto";

const generateJwtToken = (agent) => {
  return jwt.sign(
    { id: agent._id, phone: agent.phone },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
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
    const { agentEmail, phone } = req.body;

    if (!agentEmail && !phone) {
      return res
        .status(400)
        .json({ message: "Email or phone is required", status: false });
    }

    const agent = await Agent.findOne({
      $or: [{ agentEmail }, { phone }],
    });

    if (!agent) {
      return res
        .status(404)
        .json({ message: "Agent not found", status: false });
    }

    const otp = generateSixDigitOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    // Assign OTP based on login method
    if (agentEmail) {
      agent.emailOtp = otp;
      agent.emailOtpExpiresAt = expiresAt;
    } else {
      agent.phoneOtp = otp;
      agent.phoneOtpExpiresAt = expiresAt;
    }

    await agent.save();

    return res.status(200).json({
      status: true,
      message: "Login OTP generated successfully",
      otp,
    });
  } catch (err) {
    console.error("Error in generateLoginOtp:", err);
    return res.status(500).json({ message: "Server Error", status: false });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { agentEmail, phone, otp, firebaseToken } = req.body;

    if (!otp || (!agentEmail && !phone)) {
      return res
        .status(400)
        .json({ message: "Email/Phone and OTP required", status: false });
    }

    const agent = await Agent.findOne({
      $or: [{ agentEmail }, { phone }],
    });

    if (!agent) {
      return res
        .status(404)
        .json({ message: "Agent not found", status: false });
    }

    // Verify OTP based on login method
    let valid = false;
    if (agentEmail) {
      if (
        agent.emailOtp === otp &&
        new Date() < new Date(agent.emailOtpExpiresAt)
      ) {
        valid = true;
        agent.emailVerified = true;
        agent.emailOtp = null;
        agent.emailOtpExpiresAt = null;
      }
    } else {
      if (
        agent.phoneOtp === otp &&
        new Date() < new Date(agent.phoneOtpExpiresAt)
      ) {
        valid = true;
        agent.phoneVerified = true;
        agent.phoneOtp = null;
        agent.phoneOtpExpiresAt = null;
      }
    }

    if (!valid) {
      return res
        .status(400)
        .json({ message: "Invalid or expired OTP", status: false });
    }

    // Update Firebase token if provided
    if (firebaseToken) {
      agent.firebaseToken = firebaseToken;
    }

    await agent.save();

    // Check admin verification before allowing login
    if (agent.adminVerified !== "approved") {
      return res.status(403).json({
        status: false,
        message: "Your profile is pending admin approval.",
      });
    }

    // Generate JWT token
    const token = generateJwtToken(agent);

    return res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      data: agent,
    });
  } catch (err) {
    console.error("Error in verifyLoginOtp:", err);
    return res.status(500).json({ message: "Server Error", status: false });
  }
};

export const resendAgentOtp = async (req, res) => {
  try {
    const { phone, agentEmail } = req.body;

    // ✅ Input validation
    if (!phone && !agentEmail) {
      return res.status(400).json({
        message: "Either phone or email is required",
        status: false,
      });
    }

    // ✅ Find the agent
    let agent;
    if (phone) {
      agent = await Agent.findOne({ phone });
    } else {
      agent = await Agent.findOne({ agentEmail });
    }

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found",
        status: false,
      });
    }

    // ✅ Generate OTP & set expiry
    const generatedOtp = generateSixDigitOtp();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // ✅ Assign OTP to correct field
    let otpType = "";
    if (phone) {
      agent.phoneOtp = generatedOtp;
      agent.phoneOtpExpiresAt = expiryTime;
      otpType = "phone";
    } else {
      agent.emailOtp = generatedOtp;
      agent.emailOtpExpiresAt = expiryTime;
      otpType = "email";
    }

    await agent.save();

    // ✅ Respond
    res.status(200).json({
      status: true,
      message: `${
        otpType === "phone" ? "Mobile" : "Email"
      } OTP resent successfully`,
      otp: generatedOtp, // ⚠️ Remove this in production
      type: otpType,
    });
  } catch (error) {
    console.error("Error in resendAgentOtp:", error);
    res.status(500).json({
      status: false,
      message: "Server Error",
    });
  }
};

export const completeAgentRegistration = async (req, res) => {
  try {
    const {
      fullName,
      agentEmail,
      phone,
      sector,
      aadharNumber,
      firebaseToken,
      paymentId,
      paymentStatus = "success",
    } = req.body;

    const files = req.files;
    const profileImage = files?.profileImage?.[0]?.filename || "";
    const aadharFrontImage = files?.aadharFrontImage?.[0]?.filename || "";
    const aadharBackImage = files?.aadharBackImage?.[0]?.filename || "";

    if (!fullName || !agentEmail || !phone || !sector || !aadharNumber) {
      return res.status(400).json({
        message:
          "All fields are required: fullName, agentEmail, phone, sector, aadharNumber",
        status: false,
      });
    }

    if (!aadharFrontImage || !aadharBackImage) {
      return res.status(400).json({
        message: "Both Aadhaar front and back images are required",
        status: false,
      });
    }

    let agent = await Agent.findOne({ phone, phoneVerified: true });

    if (!agent) {
      return res.status(400).json({
        message: "Phone number not verified. Please verify your phone first.",
        status: false,
      });
    }

    agent.fullName = fullName;
    agent.agentEmail = agentEmail;
    agent.sector = sector;
    agent.aadharNumber = aadharNumber;
    agent.profileImage = profileImage;
    agent.aadharFrontImage = aadharFrontImage;
    agent.aadharBackImage = aadharBackImage;
    agent.firebaseToken = firebaseToken || agent.firebaseToken;

    // Payment details
    agent.paymentId = paymentId;
    agent.paymentStatus = paymentStatus;
    agent.paymentDate = new Date();

    await agent.save();

    res.status(200).json({
      message:
        "Agent registration completed successfully! Your profile is pending admin approval.",
      status: true,
      data: agent,
    });
  } catch (error) {
    console.error("Error in completeAgentRegistration:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAgentById = async (req, res) => {
  try {
    const agentId = req.user.id;

    if (!agentId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    let agent = await Agent.findById(agentId).select("-otp -otpExpiresAt"); // Exclude sensitive fields
    if (!agent) {
      return res
        .status(404)
        .json({ message: "Agent not found", status: false });
    }

    res.status(200).json({
      message: "Agent fetched successfully",
      status: true,
      data: agent,
    });
  } catch (error) {
    console.error("Error in getAgentById:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const updateAgentProfileImage = async (req, res) => {
  try {
    const agentId = req.agent?.id;

    if (!agentId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res
        .status(404)
        .json({ status: false, message: "Agent not found" });
    }

    const file = req.file || req.files?.profileImage?.[0];
    if (!file) {
      return res
        .status(400)
        .json({ status: false, message: "No profile image uploaded" });
    }

    agent.profileImage = file.filename;
    await agent.save();

    return res.status(200).json({
      status: true,
      message: "Profile image updated successfully",
      profileImage: agent.profileImage,
    });
  } catch (error) {
    console.error("Error updating profile image:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
