// controllers/organizationPaymentController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = "http://localhost:3000"; // update for production
const PLAN_ID = "227750"; // your plan ID
const BASE_AMOUNT_NGN = 51000;

// Helper: extend subscription if endDate passed
const rolloverSubscription = (vipSubscription) => {
  const now = new Date();
  if (vipSubscription && vipSubscription.endDate) {
    const endDate = new Date(vipSubscription.endDate);
    if (now >= endDate) {
      vipSubscription.startDate = endDate;
      vipSubscription.endDate = new Date(
        endDate.getTime() + 30 * 24 * 60 * 60 * 1000
      ); // +30 days
    }
  }
  return vipSubscription;
};

// ------------------- Auto-rollover for all users -------------------
const startSubscriptionRolloverChecker = () => {
  // Check every hour (3600000 ms) — you can adjust
  setInterval(async () => {
    try {
      const users = await User.find({ "vipSubscription.active": true });
      for (const user of users) {
        const oldEndDate = user.vipSubscription.endDate;
        const updatedSub = rolloverSubscription(user.vipSubscription);
        if (oldEndDate !== updatedSub.endDate) {
          user.vipSubscription = updatedSub;
          await user.save();
          console.log(`✅ Rolled over VIP subscription for ${user.email}`);
        }
      }
    } catch (err) {
      console.error("❌ Auto-rollover error:", err.message);
    }
  }, 3600000); // 1 hour interval
};

// Start the rollover checker when the controller file is imported
startSubscriptionRolloverChecker();

// ------------------- Payment Controllers -------------------

// Step 1: Initialize payment
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    const amount = BASE_AMOUNT_NGN;
    const tx_ref = `ORG-${Date.now()}-${userId}`;

    const payload = {
      tx_ref,
      amount,
      currency: "NGN",
      redirect_url: `${FRONTEND_URL}/org-processing`,
      payment_options: "card",
      payment_plan: PLAN_ID,
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

// Step 2: Verify payment & update subscription in DB
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

    // Set initial 30-day interval if new, or roll over if expired
    if (!user.vipSubscription) {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        planId: PLAN_ID,
        subscriptionId: tx_ref,
        startDate: now,
        endDate: endDate,
      };
    } else {
      user.vipSubscription = rolloverSubscription(user.vipSubscription);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Subscription verified and VIP updated",
      vipSubscription: user.vipSubscription,
    });
  } catch (err) {
    console.error("❌ Verification error:", err.response?.data || err.message);
    next(createError(500, "Payment verification failed"));
  }
};
