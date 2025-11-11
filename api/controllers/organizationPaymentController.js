import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;

// 💳 Step 1 — Create Flutterwave Checkout Link
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization") {
      return next(createError(400, "Only organizations can subscribe"));
    }

    const amount = 50000;
    const tx_ref = `ORG-${Date.now()}-${userId}`;

    // 🌍 Flutterwave hosted checkout payload
    const payload = {
      tx_ref,
      amount,
      currency: "NGN",
      redirect_url: `${FRONTEND_URL}/org-processing`,
      customer: {
        email: user.email,
        name: user.fullname || user.username,
      },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Unlock job posting privileges and premium access",
        logo: `${FRONTEND_URL}/logo.png`,
      },
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
      const checkoutLink = flwRes.data.data.link;
      return res.status(200).json({
        success: true,
        checkoutLink,
        tx_ref,
      });
    }

    throw new Error("Unable to initialize payment");
  } catch (error) {
    console.error("❌ Payment initialization error:", error.response?.data || error.message);
    next(createError(500, "Payment initialization failed"));
  }
};

// 💳 Step 2 — Verify payment after redirect
export const verifyOrganizationPayment = async (req, res, next) => {
  try {
    const { tx_ref } = req.body;
    if (!tx_ref) return next(createError(400, "Missing transaction reference"));

    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    const { data } = verifyRes.data;
    const status = data.status?.toLowerCase();
    const isTestMode = process.env.NODE_ENV === "development";

    if (
      (status === "successful" || (isTestMode && status === "pending")) &&
      Number(data.amount) >= 50000 &&
      data.currency === "NGN"
    ) {
      const user = await User.findById(req.user?.id);
      if (!user) return next(createError(404, "User not found"));

      // 💎 Activate VIP subscription
      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        paymentReference: data.tx_ref,
        transactionId: data.id,
        amount: data.amount,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      };

      await user.save();
      console.log(`🎉 VIP activated for ${user.email}`);

      return res.status(200).json({
        success: true,
        message: "✅ Payment verified successfully — VIP activated",
        data,
      });
    }

    console.warn("🚫 Payment not successful or still pending:", status);
    return res.status(400).json({
      success: false,
      message: `Payment not verified (status: ${status})`,
      data,
    });
  } catch (error) {
    console.error("❌ Verification error:", error.response?.data || error.message);
    next(createError(400, "Payment verification failed"));
  }
};
