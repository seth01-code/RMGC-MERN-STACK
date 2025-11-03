import express from "express";
import {
  createOrganizationSubscription,
  validateOrganizationOtp,
  verifyOrganizationPayment,
} from "../controllers/organizationPaymentController.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post(
  "/organization/subscribe",
  verifyToken,
  createOrganizationSubscription
);
router.post("/organization/validate-otp", verifyToken, validateOrganizationOtp);
router.post("/organization/verify", verifyToken, verifyOrganizationPayment);

export default router;
