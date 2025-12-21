// controllers/organizationSubscriptionController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_LIVE_SECRET_KEY;
const FRONTEND_URL =  process.env.FRONTEND_URL || "http://localhost:3000";

// Updated fixed pricing
const PLAN_PRICES = {
  NGN: 54000,
  USD: 45,
  EUR: 35,
  GBP: 35,
};

// Flutterwave plan IDs
const PLAN_IDS = {
  NGN: "151073",
  USD: "151075",
  EUR: "151076",
  GBP: "151077",
};

// ---------------- CREATE SUBSCRIPTION (GENERIC) ----------------
const initializeSubscription = async (req, res, currency) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    const amount = PLAN_PRICES[currency];
    const planId = PLAN_IDS[currency];
    const tx_ref = `ORG-${currency}-${Date.now()}-${userId}`;

    // Update user subscription
    user.vipSubscription = {
      active: false,
      gateway: "flutterwave",
      currency,
      amount,
      planId,
      subscriptionId: tx_ref,
    };
    await user.save();

    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${FRONTEND_URL}/organization/dashboard`,
      payment_options: "card",
      payment_plan: planId,
      customer: {
        email: user.email,
        name: user.fullname || user.username,
      },
      customizations: {
        title: "RMGC Organization Plan",
        description: `${currency} Subscription Plan`,
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      meta: { planId, currency, userId },
    };

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

    return res.status(200).json({
      success: true,
      checkoutLink: flwRes.data.data.link,
      vipSubscription: user.vipSubscription,
    });
  } catch (err) {
    console.log("❌ Subscription error:", err.response?.data || err.message);
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
