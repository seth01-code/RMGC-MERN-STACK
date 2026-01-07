// controllers/organizationSubscriptionController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_LIVE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://localhost:3000";

// Updated fixed pricing
const PLAN_PRICES = {
  NGN: 54000,
  USD: 45,
  EUR: 35,
  GBP: 35,
};

// Flutterwave plan IDs (LIVE dashboard)
const PLAN_IDS = {
  NGN: "151073",
  USD: "151075",
  EUR: "151076",
  GBP: "151077",
};

// ---------------- CREATE SUBSCRIPTION ----------------
const initializeSubscription = async (req, res, currency) => {
  console.log("🔵 INIT ORG SUBSCRIPTION START", {
    currency,
    userId: req.user?.id,
    env: process.env.NODE_ENV,
  });

  try {
    const userId = req.user?.id;
    if (!userId) {
      console.error("🔴 AUTH ERROR: Missing userId");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error("🔴 USER NOT FOUND:", userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role !== "organization") {
      console.error("🔴 ROLE ERROR:", user.role);
      return res.status(400).json({
        success: false,
        message: "Only organizations can subscribe",
      });
    }

    const planId = PLAN_IDS[currency];
    const amount = PLAN_PRICES[currency];

    console.log("🟡 PLAN RESOLUTION:", {
      currency,
      planId,
      amount,
    });

    if (!planId || !amount) {
      console.error("🔴 INVALID PLAN CONFIG", { currency });
      return res
        .status(400)
        .json({ success: false, message: "Invalid currency or plan" });
    }

    const tx_ref = `ORG-${currency}-${Date.now()}-${userId}`;
    console.log("🟡 TX_REF GENERATED:", tx_ref);

    user.vipSubscription = {
      active: false,
      gateway: "flutterwave",
      currency,
      amount,
      planId,
      subscriptionId: tx_ref,
    };
    await user.save();

    console.log("🟢 USER UPDATED WITH SUBSCRIPTION META", {
      userId,
      planId,
      currency,
    });

    const phoneNumber = user.phone?.startsWith("+")
      ? user.phone
      : "+2340000000000";

    console.log("🟡 CUSTOMER DETAILS:", {
      email: user.email,
      phoneNumber,
      name: user.fullname || user.username,
    });

    console.log("🧪 FRONTEND_URL ENV:", FRONTEND_URL);

    const payload = {
      tx_ref,
      redirect_url: `${FRONTEND_URL}/organization/dashboard`,
      payment_options: "card",
      payment_plan: planId,
      customer: {
        email: user.email,
        name: user.fullname || user.username,
        phone_number: phoneNumber,
      },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Subscription Plan",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      meta: { planId, userId },
    };

    console.log(
      "🚀 PAYLOAD TO FLUTTERWAVE:",
      JSON.stringify(payload, null, 2)
    );

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

    console.log("🟢 FLUTTERWAVE PAYMENT INIT SUCCESS:", flwRes.data);

    return res.status(200).json({
      success: true,
      checkoutLink: flwRes.data.data.link,
      vipSubscription: user.vipSubscription,
    });
  } catch (err) {
    console.error("❌ ORG SUBSCRIPTION FAILED");
    console.error("STATUS:", err.response?.status);
    console.error("FLW RESPONSE:", err.response?.data);
    console.error("MESSAGE:", err.message);

    return res.status(500).json({
      success: false,
      message: "Subscription failed",
    });
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
