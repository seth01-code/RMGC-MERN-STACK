import axios from "axios";
import crypto from "crypto";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import { encryptPayload } from "../utils/flutterwaveEncrypt.js";

export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const {
      email,
      fullName,
      cardNumber,
      cvv,
      expiryMonth,
      expiryYear,
      currency,
    } = req.body;
    const userId = req.user?.id;

    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization") {
      return next(createError(400, "Only organizations can subscribe"));
    }

    const amountNGN = 50000;
    const tx_ref = `ORG-${Date.now()}-${userId}`;
    const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

    // Prepare payment payload
    const payload = {
      tx_ref,
      amount: amountNGN,
      currency: "NGN",
      redirect_url: "http://localhost:3000/payment-processing",
      payment_type: "card",
      card_number: cardNumber,
      cvv,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      email,
      fullname: fullName,
    };

    // Encrypt payload
    const encryptedPayload = encryptPayload(payload, FLW_SECRET);

    // Send encrypted data to Flutterwave
    const response = await axios.post(
      "https://api.flutterwave.com/v3/charges?type=card",
      { client: encryptedPayload },
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { status, data } = response.data;

    if (status !== "success") {
      return next(createError(400, "Payment initiation failed"));
    }

    // Save subscription data
    user.vipSubscription = {
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      active: true,
      paymentReference: tx_ref,
      gateway: "flutterwave",
    };
    await user.save();

    res.status(200).json({
      message: "Organization subscription created successfully",
      data,
    });
  } catch (error) {
    console.error(
      "❌ Error in organization subscription:",
      error.response?.data || error
    );
    next(createError(500, "Internal server error"));
  }
};

export const verifyOrganizationPayment = async (req, res) => {
  try {
    const { tx_ref, transaction_id, email } = req.body;

    if (!transaction_id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing transaction ID" });
    }

    const verify = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const data = verify.data.data;

    if (data.status !== "successful") {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    const user = await User.findOne({ email });

    if (user) {
      user.vipSubscription = {
        active: true,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        paymentReference: tx_ref,
        gateway: "flutterwave",
      };
      await user.save();
    }

    return res.json({
      success: true,
      message: "Subscription activated successfully",
    });
  } catch (error) {
    console.error("❌ Verification error:", error.response?.data || error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
