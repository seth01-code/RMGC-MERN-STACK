// controllers/organizationSubscriptionController.js
import axios from "axios";
import User from "../models/userModel.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "https://localhost:3000";

// Base plan amounts for organizations
const PLAN_PRICES = {
  NGN: 54000,
  USD: 45,
  EUR: 35,
  GBP: 35,
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
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(userId);
    if (!user || user.role !== "organization") {
      console.error("🔴 ROLE ERROR", { found: !!user, role: user?.role });
      return res
        .status(400)
        .json({ success: false, message: "Only organizations can subscribe" });
    }

    const amount = PLAN_PRICES[currency];
    console.log("🟡 PLAN AMOUNT RESOLVED:", amount, currency);

    // ---------- CREATE PLAN ON FLUTTERWAVE ----------
    const planPayload = {
      name: `VIP ${currency} - ${user.username}`,
      amount,
      interval: "yearly", // <-- changed from monthly
      currency,
      description: `VIP subscription for ${user.username}`,
    };

    console.log("🟠 CREATING PAYMENT PLAN...", planPayload);

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
    if (!planId) {
      console.error("🔴 PLAN CREATION FAILED", planRes.data);
      throw new Error("Plan creation returned no planId");
    }

    console.log("🟢 PLAN CREATED SUCCESSFULLY:", planRes.data);

    // ---------- CREATE TRANSACTION ----------
    const tx_ref = `ORG-${currency}-${Date.now()}-${userId}`;

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

    const phoneNumber = user.phone?.startsWith("+")
      ? user.phone
      : "+2340000000000";

    const payload = {
      tx_ref,
      amount, // REQUIRED
      currency, // REQUIRED
      redirect_url: `${FRONTEND_URL}/organization/dashboard`,
      payment_options: "card",
      payment_plan: planId, // Newly created plan
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

    console.log("🟢 PAYMENT INIT SUCCESS:", flwRes.data);

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
