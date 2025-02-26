import express from "express";
import {
  register,
  login,
  logout,
  verifyOtp,
  resendOtp,
  forgotPassword,
  // verifyEditOtp,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-otp", verifyOtp);
// router.post("/verify-edit-otp", verifyEditOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);

export default router;
