import express from "express";
import { handleSubscriptionWebhook } from "../controllers/flutterwaveWebhookController.js";

const router = express.Router();

// Webhook endpoint
router.post("/flutterwave/webhook", express.json(), handleSubscriptionWebhook);

export default router;
