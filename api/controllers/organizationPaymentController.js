import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import { encryptPayload } from "../utils/flutterwaveEncrypt.js";

const FLW_PUBLIC = process.env.FLW_PUBLIC_KEY;
const FLW_SECRET = process.env.FLW_SECRET_KEY;
const FLW_ENCRYPTION = process.env.FLW_ENCRYPTION_KEY;

// Create yearly recurring subscription
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
      return next(
        createError(403, "Only registered organizations can subscribe")
      );
    }

    const tx_ref = `ORG-${Date.now()}-${userId}`;
    const amount = currency === "USD" ? 60 : 50000; // Adjust price by currency

    // Encrypt payment payload
    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${process.env.CLIENT_URL}/org-processing?tx_ref=${tx_ref}`,
      payment_type: "card",
      card_number: cardNumber.replace(/\s/g, ""),
      cvv,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      email,
      fullname: fullName,
      authorization: {
        mode: "pin",
        pin: "3310", // You can ask user in form for PIN if required
      },
    };

    const encryptedPayload = encryptPayload(payload, FLW_ENCRYPTION);

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

    if (
      data.status === "pending" &&
      data.processor_response === "PIN or OTP required"
    ) {
      return res.status(200).json({
        requiresOtp: true,
        flwRef: data.flw_ref,
        message: "Enter the OTP sent to your phone/email",
      });
    }

    if (status !== "success")
      return next(createError(400, "Payment initiation failed"));

    res.status(200).json({
      message: "Payment initiated successfully",
      tx_ref,
      data,
    });
  } catch (error) {
    console.error(
      "❌ Error creating subscription:",
      error.response?.data || error.message
    );
    next(createError(500, "Internal server error"));
  }
};

// Submit OTP if required
export const validateOrganizationOtp = async (req, res, next) => {
  try {
    const { otp, flwRef } = req.body;

    const response = await axios.post(
      "https://api.flutterwave.com/v3/validate-charge",
      { otp, flw_ref: flwRef },
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = response.data;

    if (data.status === "successful") {
      // Save card token for recurring billing
      const user = await User.findById(req.user.id);
      user.subscriptionToken = data.card?.token || null;
      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        paymentReference: data.tx_ref,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      };
      await user.save();

      return res.status(200).json({
        message: "OTP verified, subscription activated ✅",
        data,
      });
    }

    return res.status(400).json({ message: "OTP verification failed" });
  } catch (error) {
    console.error(
      "❌ Error validating OTP:",
      error.response?.data || error.message
    );
    next(createError(500, "Internal server error"));
  }
};

// Verify payment route
export const verifyOrganizationPayment = async (req, res, next) => {
  try {
    const { tx_ref } = req.body;
    if (!tx_ref) return res.status(400).json({ message: "tx_ref required" });

    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
        },
      }
    );

    const { data } = verifyRes.data;
    if (data.status === "successful") {
      const user = await User.findById(req.user.id);
      if (!user) return next(createError(404, "User not found"));

      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        paymentReference: tx_ref,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      };
      await user.save();

      return res.status(200).json({
        message: "Payment verified successfully ✅",
        data,
      });
    }

    res.status(400).json({ message: "Payment not verified yet", data });
  } catch (error) {
    console.error(
      "❌ Verification error:",
      error.response?.data || error.message
    );
    next(createError(500, "Internal server error"));
  }
};
