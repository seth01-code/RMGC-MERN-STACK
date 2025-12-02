// controllers/organizationPaymentController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = "http://localhost:3000"; // update for production
const PLAN_ID = "227735"; // your hourly plan ID
const BASE_AMOUNT_NGN = 51000;

// Step 1: Initialize payment
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    // Fixed amount for plan
    const amount = BASE_AMOUNT_NGN;
    const tx_ref = `ORG-${Date.now()}-${userId}`;

    const payload = {
      tx_ref,
      amount,
      currency: "NGN",
      redirect_url: `${FRONTEND_URL}/org-processing`,
      payment_options: "card",
      customer: { email: user.email, name: user.fullname || user.username },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Initial payment for recurring subscription",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      meta: { plan: PLAN_ID },
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
        currency: "NGN",
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

// Step 2: Verify payment & subscribe to plan
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
    if (!cardToken)
      return next(
        createError(400, "Card token not available for recurring charges")
      );

    // Save token for future charges
    user.cardToken = cardToken;

    // Subscribe user to the hourly plan
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
      endDate: null, // Flutterwave handles hourly recurring
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Subscribed to hourly plan successfully",
      subscriptionId: subRes.data.data.id,
    });
  } catch (err) {
    console.error("❌ Verification error:", err.response?.data || err.message);
    next(createError(500, "Payment verification failed"));
  }
};
