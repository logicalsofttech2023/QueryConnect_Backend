import express from "express";
import {
  generateOtp,
  verifyOtp,
  resendAgentOtp,
  completeAgentRegistration,
  getAgentById,
  updateAgentProfileImage,
} from "../controllers/agentController.js";

import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/authMiddleware.js";
import { uploadProfile } from "../middlewares/uploadMiddleware.js";
import { createRoom, getAgentRooms } from "../controllers/chatRoomController.js";

const router = express.Router();

/* ----------------------------------
   🔐 OTP & Registration
---------------------------------- */
router.post("/generateOtp", generateOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/resendAgentOtp", resendAgentOtp);
router.post(
  "/completeAgentRegistration",
  uploadProfile.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "aadharFrontImage", maxCount: 1 },
    { name: "aadharBackImage", maxCount: 1 },
    { name: "panFrontImage", maxCount: 1 },
    { name: "panBackImage", maxCount: 1 },
  ]),
  completeAgentRegistration
);

/* ----------------------------------
   👤 User Profile
---------------------------------- */
router.post(
  "/updateAgentProfileImage",
  authMiddleware,
  uploadProfile.fields([{ name: "profileImage", maxCount: 1 }]),
  updateAgentProfileImage
);
router.get("/getAgentById", authMiddleware, getAgentById);


router.post("/createRoom", authMiddleware, createRoom);
router.get("/getAgentRooms", authMiddleware, getAgentRooms);



export default router;
