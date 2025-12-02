// controllers/organizationPaymentController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const PLAN_ID = "227735"; // Flutterwave plan ID

// Create Subscription
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    // Use cardToken if available, or ask user to pay once to get a token
    if (!user.cardToken)
      return next(
        createError(
          400,
          "You need to make an initial payment to get a card token"
        )
      );

    // Subscribe user to Plan
    const subscriptionPayload = {
      customer: user.email,
      plan: PLAN_ID,
      authorization: user.cardToken,
      start_date: new Date().toISOString(),
    };

    const subRes = await axios.post(
      "https://api.flutterwave.com/v3/subscriptions",
      subscriptionPayload,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    if (subRes.data.status !== "success") {
      console.error("❌ Subscription failed:", subRes.data);
      return next(createError(500, "Subscription creation failed"));
    }

    user.vipSubscription = {
      active: true,
      gateway: "flutterwave",
      planId: PLAN_ID,
      subscriptionId: subRes.data.data.id,
      startDate: new Date(),
      endDate: null, // Flutterwave will handle end date via webhook
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Subscribed to recurring plan successfully",
      subscriptionId: subRes.data.data.id,
    });
  } catch (err) {
    console.error("❌ Subscription error:", err.response?.data || err.message);
    next(createError(500, "Subscription creation failed"));
  }
};
