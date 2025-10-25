import jwt from "jsonwebtoken";
import Agent from "../models/AgentModel.js";
import crypto from "crypto";

const generateJwtToken = (agent) => {
  return jwt.sign({ id: agent._id, phone: agent.phone }, process.env.JWT_SECRET, {
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

export const generateAgentOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        message: "phone, is required",
        status: false,
      });
    }

    let agent = await Agent.findOne({ phone });

    const generatedOtp = generateSixDigitOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    if (agent) {
      agent.otp = generatedOtp;
      agent.otpExpiresAt = otpExpiresAt;
    } else {
      agent = new Agent({
        phone,
        otp: generatedOtp,
        otpExpiresAt,
      });
    }

    await agent.save();

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

export const verifyAgentOtp = async (req, res) => {
  try {
    const { phone, otp, firebaseToken } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: "phone, and otp are required",
        status: false,
      });
    }

    let agent = await Agent.findOne({ phone });

    if (!agent || agent.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", status: false });
    }

    if (new Date() > new Date(agent.otpExpiresAt)) {
      return res.status(400).json({ message: "OTP expired", status: false });
    }

    agent.otpExpiresAt = "";
    agent.isVerified = true;
    agent.firebaseToken = firebaseToken;
    await agent.save();

    let token = "";
    let agentExit = false;

    if (agent.fullName) {
      agentExit = true;

      if (agent.adminVerified !== "approved") {
        return res.status(403).json({
          message: "Your account is not verified by admin yet.",
          status: false,
          agentExit: true,
        });
      }

      token = generateJwtToken(agent);
    }

    res.status(200).json({
      message: "OTP verified successfully",
      status: true,
      token,
      agentExit,
      data: agent,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const resendAgentOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        message: "phone are required",
        status: false,
      });
    }

    let agent = await Agent.findOne({ phone });
    if (!agent) {
      return res.status(400).json({ message: "agent not found", status: false });
    }

    const generatedOtp = generateSixDigitOtp();
    agent.otp = generatedOtp;
    agent.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await agent.save();

    res.status(200).json({
      message: "OTP resent successfully",
      status: true,
      data: generatedOtp,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const completeAgentRegistration = async (req, res) => {
  try {
    const {
      fullName,
      agentEmail,
      dob,
      gender,
      phone,
      aadharNumber,
      firebaseToken,
    } = req.body;

    const files = req.files;
    const profileImage = files?.profileImage?.[0]?.filename || "";
    const aadharFrontImage = files?.aadharFrontImage?.[0]?.filename || "";
    const aadharBackImage = files?.aadharBackImage?.[0]?.filename || "";

    let agent = await Agent.findOne({ phone });

    if (!agent || !agent.isVerified) {
      return res
        .status(400)
        .json({ message: "Agent not verified", status: false });
    }

    if (!fullName) {
      return res
        .status(400)
        .json({ message: "First and last names are required", status: false });
    }

    // Update profile fields
    agent.fullName = fullName;
    agent.dob = dob || "";
    agent.gender = gender || "";
    agent.agentEmail = agentEmail || "";
    agent.aadharNumber = aadharNumber || "";
    agent.firebaseToken = firebaseToken || "";
    agent.profileImage = profileImage;
    agent.aadharFrontImage = aadharFrontImage;
    agent.aadharBackImage = aadharBackImage;

    await agent.save();

    // Admin approval check before generating token
    if (agent.adminVerified !== "approved") {
      return res.status(403).json({
        message:
          "Your profile is submitted successfully and is pending admin approval.",
        status: true,
        agentExit: true,
        token: "",
      });
    }

    // Generate token only if admin has approved
    const token = generateJwtToken(agent);

    res.status(200).json({
      message: "agent registered successfully",
      status: true,
      token,
      agentExit: true,
      data: agent,
    });
  } catch (error) {
    console.error("Error in completeRegistration:", error);
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
      return res.status(404).json({ message: "Agent not found", status: false });
    }

    res
      .status(200)
      .json({ message: "Agent fetched successfully", status: true, data: agent });
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
      return res.status(404).json({ status: false, message: "Agent not found" });
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
