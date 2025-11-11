import express from "express";
import {
  createOrganizationPlan,
  subscribeOrganization,
  verifyOrganizationSubscription,
} from "../controllers/organizationPaymentController.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

// 1️⃣ Create a recurring plan (test: 1-minute interval)
router.post("/organization/plan", verifyToken, createOrganizationPlan);

// 2️⃣ Subscribe organization to a plan (card-only)
router.post("/organization/subscribe", verifyToken, subscribeOrganization);

// 3️⃣ Verify subscription and activate VIP
router.post(
  "/organization/verify",
  verifyToken,
  verifyOrganizationSubscription
);

export default router;
