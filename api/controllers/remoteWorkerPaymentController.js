// controllers/remoteWorkerPaymentController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Fixed pricing for remote worker VIP subscription
const PLAN_PRICES = {
  NGN: 12000,
  USD: 30,
  EUR: 25,
  GBP: 25,
};

// Flutterwave plan IDs (replace with actual IDs)
const PLAN_IDS = {
  NGN: "228055",
  USD: "228056",
  EUR: "228057",
  GBP: "228058",
};

// ---------------- CREATE SUBSCRIPTION (REMOTE WORKER) ----------------
const initializeSubscription = async (req, res, currency) => {
  try {
    console.log("🔹 Initializing subscription for remote worker...");

    const userId = req.user?.id;
    console.log("User ID from token:", userId);

    if (!userId) {
      console.log("❌ No user ID found in request");
      return next(createError(401, "Unauthorized"));
    }

    const user = await User.findById(userId);
    console.log("Fetched user from DB:", user);

    if (!user || user.role !== "remote_worker") {
      console.log("❌ User is not a remote worker or does not exist");
      return next(createError(400, "Only remote workers can subscribe"));
    }

    const amount = PLAN_PRICES[currency];
    const planId = PLAN_IDS[currency];

    console.log(`Selected currency: ${currency}, amount: ${amount}, planId: ${planId}`);

    const tx_ref = `RW-${currency}-${Date.now()}-${userId}`;
    console.log("Transaction reference:", tx_ref);

    // Update remote worker VIP subscription in DB
    user.vipSubscription = {
      active: false,
      gateway: "flutterwave",
      currency,
      amount,
      planId,
      subscriptionId: tx_ref,
    };

    await user.save();
    console.log("✅ User VIP subscription updated in DB");

    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${FRONTEND_URL}/remote-vip-success`,
      payment_options: "card",
      payment_plan: planId,
      customer: {
        email: user.email,
        name: user.fullName || user.username,
      },
      customizations: {
        title: "RMGC Remote Worker VIP Plan",
        description: `${currency} Subscription Plan`,
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      meta: { planId, currency, userId },
    };

    console.log("Payload for Flutterwave:", JSON.stringify(payload, null, 2));

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

    console.log("💰 Flutterwave response:", flwRes.data);

    return res.status(200).json({
      success: true,
      checkoutLink: flwRes.data.data.link,
      vipSubscription: user.vipSubscription,
    });
  } catch (err) {
    console.log(
      "❌ Remote worker subscription error full:",
      err.response?.data || err.message
    );
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
