import express from "express";
import { verifyToken, verifySeller } from "../middleware/jwt.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import {
  getOrder,
  intent,
  completeOrder,
  // flutterWaveIntent,
  updateOrderStatus,
  getSalesRevenue,
  getSellerRevenue,
  getAdminRevenue,
  getCompletedOrders,
  getAllCompletedOrders,
  paystackWebhook,
} from "../controllers/orderController.js";

const router = express.Router();

// Fetch all orders for logged-in user
router.get("/", verifyToken, getOrder);

// Payment intent for creating orders (for Paystack)
router.post("/create-payment-intent/:id", verifyToken, intent);
router.post("/paystack-webhook", paystackWebhook);
// router.get("/verify", verifyToken, verifyPayment);

// Payment intent for PayPal (separate route)
// router.post("/create-flutterwave-intent/:id", verifyToken, flutterWaveIntent);

// Confirm payment and update order status
// router.put("/", verifyToken, confirm);

// Fetch seller's orders
// router.get("/seller", verifyToken, verifySeller, getSellerOrders);

// Fetch completed orders (for revenue tracking)
// router.get("/completed", verifyToken, verifySeller, getCompletedOrders);

// Mark order as completed
router.put("/:id/complete", verifyToken, completeOrder);

router.patch("/:orderId", updateOrderStatus);
router.get("/sales-revenue", verifyToken, verifySeller, getSalesRevenue);
router.get("/seller-revenue", verifyToken, getSellerRevenue);
router.get("/admin-revenue", verifyToken, verifyAdmin, getAdminRevenue);
router.get("/completed", verifyToken, verifySeller, getCompletedOrders);
router.get("/all-completed", verifyToken, verifyAdmin, getAllCompletedOrders);

export default router;
