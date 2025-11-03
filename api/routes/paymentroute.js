import express from "express";
import {
  createOrganizationSubscription,
  verifyOrganizationPayment,
  submitCardPin,
  validateOtp,
} from "../controllers/organizationPaymentController.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post(
  "/organization/subscribe",
  verifyToken,
  createOrganizationSubscription
);
router.post("/organization/submit-pin", verifyToken, submitCardPin);
router.post("/organization/validate-otp", verifyToken, validateOtp);
router.post("/organization/verify", verifyToken, verifyOrganizationPayment);

export default router;
