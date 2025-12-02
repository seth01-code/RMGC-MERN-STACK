import express from "express";
import { handleFlutterwaveWebhook } from "../controllers/flutterwaveWebhookController.js";

const router = express.Router();

// Flutterwave webhook endpoint
router.post("/flutterwave/webhook", express.raw({ type: "*/*" }), handleFlutterwaveWebhook);

export default router;
