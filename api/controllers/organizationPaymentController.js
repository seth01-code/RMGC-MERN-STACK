// controllers/organizationPaymentController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import { encryptPayload } from "../utils/flutterwaveEncrypt.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY; // Flutterwave 3DES key
const FRONTEND_URL = "http://localhost:3000"; // adjust for prod
const PLAN_ID = "227735"; // Flutterwave plan ID
const BASE_AMOUNT_NGN = 50000;
const FEE_PERCENT = 7.5;

// Fetch exchange rate
const getExchangeRate = async (currency) => {
  try {
    if (currency === "NGN") return 1;
    const res = await axios.get("https://open.er-api.com/v6/latest/USD");
    const rates = res.data?.rates || {};
    const usdToCurrency = rates[currency];
    const usdToNgn = rates["NGN"];
    if (!usdToCurrency || !usdToNgn) return 1;
    return usdToCurrency / usdToNgn;
  } catch (err) {
    console.error("⚠️ Exchange rate fetch failed:", err.message);
    return 1;
  }
};

// Step 1: Initialize first payment
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    let { currency } = req.body;
    currency = (currency || "NGN").toUpperCase();

    const exchangeRate = await getExchangeRate(currency);
    const amount =
      Math.round(
        BASE_AMOUNT_NGN * exchangeRate * (1 + FEE_PERCENT / 100) * 100
      ) / 100;

    const tx_ref = `ORG-${Date.now()}-${userId}`;

    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${FRONTEND_URL}/org-processing`,
      payment_options: "card",
      customer: { email: user.email, name: user.fullname || user.username },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Initial payment for recurring subscription",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      meta: { card_only: true },
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

    if (flwRes.data.status === "success") {
      return res.status(200).json({
        success: true,
        checkoutLink: flwRes.data.data.link,
        tx_ref,
        amount,
        currency,
      });
    }

    throw new Error("Unable to initialize payment");
  } catch (err) {
    console.error(
      "❌ Payment initialization error:",
      err.response?.data || err.message
    );
    next(createError(500, "Payment initialization failed"));
  }
};

// Step 2: Verify payment & create recurring subscription
export const verifyOrganizationPayment = async (req, res, next) => {
  try {
    const { tx_ref } = req.body;
    if (!tx_ref) return next(createError(400, "Missing transaction reference"));

    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    const { data } = verifyRes.data;
    if (data.status?.toLowerCase() !== "successful")
      return next(createError(400, "Payment not successful"));

    const user = await User.findById(req.user?.id);
    if (!user) return next(createError(404, "User not found"));

    const cardToken = data.card?.token;
    if (!cardToken) return next(createError(400, "Card token not available"));

    // Save token for future recurring charges
    user.cardToken = cardToken;

    // Subscribe user to recurring plan
    const subscriptionPayload = {
      customer: user.email,
      plan: PLAN_ID,
      authorization: cardToken,
      start_date: new Date().toISOString(),
    };

    const subRes = await axios.post(
      "https://api.flutterwave.com/v3/subscriptions",
      subscriptionPayload,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    if (subRes.data.status !== "success") {
      console.error("❌ Subscription creation failed:", subRes.data);
      return next(createError(500, "Subscription creation failed"));
    }

    // Save subscription info in user
    user.vipSubscription = {
      active: true,
      gateway: "flutterwave",
      planId: PLAN_ID,
      subscriptionId: subRes.data.data.id,
      startDate: new Date(),
      endDate: null, // Flutterwave handles recurring end date
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Subscribed to recurring plan successfully",
      subscriptionId: subRes.data.data.id,
    });
  } catch (err) {
    console.error(
      "❌ Subscription verification error:",
      err.response?.data || err.message
    );
    next(createError(500, "Subscription verification failed"));
  }
};
