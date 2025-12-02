import express from "express";
import { handleFlutterwaveWebhook } from "../controllers/flutterwaveWebhookController.js";

const router = express.Router();

// Use express.json() instead of raw
router.post("/flutterwave/webhook", express.json({ type: "*/*" }), handleFlutterwaveWebhook);

export default router;
