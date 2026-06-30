import express from "express";
import { verifyToken, verifySeller } from "../middleware/jwt.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import {
  getOrder,
  intent,
  completeOrder,
  flutterWaveIntent,
  updateOrderStatus,
  getSalesRevenue,
  getSellerRevenue,
  getAdminRevenue,
  getCompletedOrders,
  getAllCompletedOrders,
  paystackWebhook,
  verifyFlutterWavePayment,
  workIntent,
  workFlutterWaveIntent,
  verifyPayment,
  // flutterwaveWebhook,
} from "../controllers/orderController.js";

const router = express.Router();

// Fetch all orders for logged-in user
router.get("/", verifyToken, getOrder);

// Payment intent for creating orders (for Paystack) — gig flow
router.post("/create-payment-intent/:id", verifyToken, intent);
router.post("/paystack-webhook", paystackWebhook);
// router.post("/flutterwave-webhook", flutterwaveWebhook);
router.post("/create-flutterwave-intent/:id", verifyToken, flutterWaveIntent);
router.get("/verify", verifyPayment);

// Payment intent for booking a job (work flow) — :id is the Work _id
router.post("/create-work-payment-intent/:id", verifyToken, workIntent);
router.post(
  "/create-work-flutterwave-intent/:id",
  verifyToken,
  workFlutterWaveIntent
);

// Mark order as completed
router.put("/:id/complete", verifyToken, completeOrder);

router.patch("/:orderId", updateOrderStatus);
router.get("/sales-revenue", verifyToken, verifySeller, getSalesRevenue);
router.get("/seller-revenue", verifyToken, getSellerRevenue);
router.get("/admin-revenue", verifyToken, verifyAdmin, getAdminRevenue);
router.get("/completed", verifyToken, verifySeller, getCompletedOrders);
router.get("/all-completed", verifyToken, verifyAdmin, getAllCompletedOrders);

export default router;