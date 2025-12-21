import express from "express";
import {
  register,
  login,
  logout,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  freelancerPaymentSuccess
  // verifyEditOtp,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/freelancer-payment-success", freelancerPaymentSuccess);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-otp", verifyOtp);
// router.post("/verify-edit-otp", verifyEditOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
