// controllers/remoteWorkerPaymentController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_LIVE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Fixed pricing for remote worker VIP subscription
const PLAN_PRICES = {
  NGN: 12000, // base amount
  USD: 30,
  EUR: 25,
  GBP: 25,
};

const initializeSubscription = async (req, res, currency) => {
  console.log("🔵 INIT SUBSCRIPTION START", {
    currency,
    userId: req.user?.id,
    env: process.env.NODE_ENV,
  });

  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user || user.role !== "remote_worker")
      return res
        .status(400)
        .json({ success: false, message: "Only remote workers can subscribe" });

    const amount = PLAN_PRICES[currency];
    console.log("🟡 PLAN AMOUNT RESOLVED:", amount, currency);

    // ---------- CREATE PLAN ----------
    const planPayload = {
      name: `VIP ${currency} - ${user.username}`,
      amount,
      interval: "yearly", // <-- changed from monthly
      currency,
      description: `VIP subscription for ${user.username}`,
    };

    const planRes = await axios.post(
      "https://api.flutterwave.com/v3/payment-plans",
      planPayload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const planId = planRes.data?.data?.id;
    const tx_ref = `RW-${currency}-${Date.now()}-${userId}`;

    user.vipSubscription = {
      active: false,
      gateway: "flutterwave",
      currency,
      amount,
      planId,
      subscriptionId: tx_ref,
    };
    await user.save();

    console.log("🟢 USER UPDATED WITH PLAN:", { userId, planId, tx_ref });

    // ---------- INIT PAYMENT -----------//
    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${FRONTEND_URL}/remote/dashboard`,
      payment_options: "card",
      payment_plan: planId,
      customer: {
        email: user.email,
        name: user.fullName || user.username,
        phone_number: user.phone || "0000000000",
      },
      meta: { userId, planId }, // <-- add this for webhook identification
    };

    console.log("🚀 PAYLOAD TO FLUTTERWAVE:", JSON.stringify(payload, null, 2));

    const flwRes = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ PAYMENT INIT SUCCESS:", flwRes.data);

    return res.status(200).json({
      success: true,
      checkoutLink: flwRes.data.data.link,
      vipSubscription: user.vipSubscription,
    });
  } catch (err) {
    console.error("❌ SUBSCRIPTION FAILED", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    return res
      .status(500)
      .json({ success: false, message: "Subscription failed" });
  }
};

// -------------------- EXPORTED CURRENCY CONTROLLERS --------------------
export const subscribeNGN = async (req, res) =>
  initializeSubscription(req, res, "NGN");
export const subscribeUSD = async (req, res) =>
  initializeSubscription(req, res, "USD");
export const subscribeGBP = async (req, res) =>
  initializeSubscription(req, res, "GBP");
export const subscribeEUR = async (req, res) =>
  initializeSubscription(req, res, "EUR");
