import express from "express";
import {
  generateOtp,
  verifyOtp,
  resendOtp,
  getUserById,
  getPolicyByType,
  getFAQList,
  getFAQByFaqId,
  getTransactionHistory,
  getNotificationsByUserId,
  updateProfileImage,
  updateProfile,
  createQuery,
  addCommentInQuery,
  getQueries,
} from "../controllers/userController.js";

import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/authMiddleware.js";
import { uploadProfile } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

/* ----------------------------------
   🔐 OTP & Registration
---------------------------------- */
router.post("/generateOtp", generateOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/resendOtp", resendOtp);


/* ----------------------------------
   👤 User Profile
---------------------------------- */
router.post(
  "/updateProfileImage",
  authMiddleware,
  uploadProfile.fields([{ name: "profileImage", maxCount: 1 }]),
  updateProfileImage
);
router.get("/getUserById", authMiddleware, getUserById);
router.post("/updateProfile", uploadProfile.fields([{ name: "profileImage", maxCount: 1 }]), authMiddleware, updateProfile);

/* ----------------------------------
   💰 Wallet & Transactions
---------------------------------- */
router.get("/getTransactionHistory", authMiddleware, getTransactionHistory);

/* ----------------------------------
   🔔 Notifications
---------------------------------- */
router.get(
  "/getNotificationsByUserId",
  authMiddleware,
  getNotificationsByUserId
);

/* ----------------------------------
   📃 Policy & FAQ
---------------------------------- */
router.get("/getPolicyByType", getPolicyByType);
router.get("/getFAQList", getFAQList);
router.get("/getFAQByFaqId", getFAQByFaqId);
router.get


router.post("/createQuery", authMiddleware, createQuery);
router.post("/addCommentInQuery", authMiddleware, addCommentInQuery);
router.get("/getQueries", authMiddleware, getQueries);


export default router;
