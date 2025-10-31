import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const { email, fullName, currency } = req.body;
    const userId = req.user?.id;

    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization") {
      return next(createError(400, "Only organizations can subscribe"));
    }

    const amountNGN = 50000; // ₦50,000 yearly
    const tx_ref = `ORG-${Date.now()}-${userId}`;
    const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

    // 🔹 Step 1: Initialize payment (server-side)
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref,
        amount: amountNGN,
        currency: "NGN",
        customer: {
          email,
          name: fullName,
        },
        customizations: {
          title: "Organization Subscription",
          description: "Access to RMGC organization dashboard and job posting",
          logo: "https://www.renewedmindsglobalconsult.com/logo.png",
        },
        redirect_url:
          "https://www.renewedmindsglobalconsult.com/payment/success",
      },
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data?.data;
    if (!data || !data.link) {
      return next(createError(400, "Failed to initialize payment"));
    }

    // 🔹 Step 2: Return hosted payment link to frontend (you can open it invisibly)
    res.status(200).json({
      success: true,
      paymentLink: data.link,
      tx_ref,
    });
  } catch (error) {
    console.error(
      "❌ Error in organization subscription:",
      error.response?.data || error
    );
    next(createError(500, "Internal server error"));
  }
};
