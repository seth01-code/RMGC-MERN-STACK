import express from "express";
import { createOrganizationSubscription } from "../controllers/organizationPaymentController.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/organization/subscribe", verifyToken, createOrganizationSubscription);

export default router;
