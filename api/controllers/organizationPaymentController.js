import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import { encryptPayload } from "../utils/flutterwaveEncrypt.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;

/**
 * STEP 1: Create a charge (handles PIN and OTP if required)
 */

export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const { fullName, email, cardNumber, cvv, expiryMonth, expiryYear } =
      req.body;
    const userId = req.user?.id;

    if (!userId) return next(createError(401, "Unauthorized"));
    const user = await User.findById(userId);
    if (!user || user.role !== "organization") {
      return next(createError(400, "Only organizations can subscribe"));
    }

    const amount = 50000;
    const tx_ref = `ORG-${Date.now()}-${userId}`;

    const payload = {
      tx_ref,
      amount,
      currency: "NGN",
      email,
      fullname: fullName,
      card_number: cardNumber.replace(/\s/g, ""),
      cvv,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      redirect_url: `${process.env.FRONTEND_URL}/org-processing`,
    };

    const encryptedPayload = encryptPayload(
      payload,
      process.env.FLW_ENCRYPTION_KEY
    );

    const flwRes = await axios.post(
      "https://api.flutterwave.com/v3/charges?type=card",
      { client: encryptedPayload },
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = flwRes.data;

    // Handle PIN/OTP flow
    if (data?.meta?.authorization?.mode === "pin") {
      return res.status(200).json({
        requiresPin: true,
        flwRef: data.flw_ref,
        tx_ref,
        message: "Enter your card PIN to continue",
      });
    }

    if (data?.meta?.authorization?.mode === "otp") {
      return res.status(200).json({
        requiresOtp: true,
        flwRef: data.flw_ref,
        tx_ref,
        message: "OTP required",
      });
    }

    return res.status(200).json({
      message: "Payment initiated successfully",
      data,
      tx_ref,
    });
  } catch (error) {
    console.error("❌ Payment error:", error.response?.data || error.message);
    next(createError(500, "Payment initialization failed"));
  }
};

/**
 * STEP 2: Submit PIN when required
 */
export const submitCardPin = async (req, res, next) => {
  try {
    const { flwRef, pin } = req.body;
    const payload = { flw_ref: flwRef, authorization: { mode: "pin", pin } };

    const flwRes = await axios.post(
      "https://api.flutterwave.com/v3/validate-charge",
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
        },
      }
    );

    const { data } = flwRes.data;
    if (data.status === "success" && data.meta.authorization.mode === "otp") {
      return res.status(200).json({
        requiresOtp: true,
        flwRef: data.flw_ref,
        message: "OTP sent to your phone/email",
      });
    }

    res.status(200).json({ message: "PIN submitted successfully", data });
  } catch (error) {
    console.error(
      "❌ PIN submission error:",
      error.response?.data || error.message
    );
    next(createError(400, "PIN validation failed"));
  }
};

/**
 * STEP 3: Submit OTP
 */
export const validateOtp = async (req, res, next) => {
  try {
    const { otp, flwRef } = req.body;
    const payload = { otp, flw_ref: flwRef };

    const flwRes = await axios.post(
      "https://api.flutterwave.com/v3/validate-charge",
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
        },
      }
    );

    const { data } = flwRes.data;
    if (data.status === "successful") {
      const user = await User.findById(req.user.id);
      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        paymentReference: data.tx_ref,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      };
      await user.save();

      return res
        .status(200)
        .json({ message: "Subscription activated ✅", data });
    }

    res.status(400).json({ message: "OTP verification failed", data });
  } catch (error) {
    console.error(
      "❌ OTP validation error:",
      error.response?.data || error.message
    );
    next(createError(400, "OTP validation failed"));
  }
};

/**
 * STEP 4: Verify payment (if redirected or manually checked)
 */
export const verifyOrganizationPayment = async (req, res, next) => {
  try {
    const { tx_ref, flwRef, id, transaction_id } = req.body;

    const reference = flwRef || tx_ref;
    const transactionId = id || transaction_id;

    if (!reference && !transactionId) {
      return next(createError(400, "Missing transaction reference or ID"));
    }

    let verifyRes;

    // 🧩 1️⃣ Try verifying by transaction ID first if valid
    if (
      transactionId &&
      transactionId !== "null" &&
      transactionId !== "undefined"
    ) {
      try {
        verifyRes = await axios.get(
          `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
          { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
        );
        console.log("✅ Verified by ID:", verifyRes.data?.data?.id);
      } catch (err) {
        console.warn("⚠️ ID verification failed, falling back to tx_ref...");
      }
    }

    // 🧩 2️⃣ Fallback to verify_by_reference if ID failed or not available
    if (!verifyRes || verifyRes.data?.status === "error") {
      verifyRes = await axios.get(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
        { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
      );
      console.log("✅ Verified by tx_ref:", reference);
    }

    const { data } = verifyRes.data;

    // 🧠 3️⃣ Validate transaction details
    if (
      data.status?.toLowerCase() === "successful" &&
      Number(data.amount) === 50000 &&
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

      console.log(`🎉 VIP activated for user: ${user.email} (${user._id})`);

      return res.status(200).json({
        success: true,
        message:
          "✅ Payment verified successfully — VIP subscription activated",
        data,
      });
    }

    // ❌ Payment not verified
    console.warn("🚫 Payment not successful or still pending:", data.status);
    return res.status(400).json({
      success: false,
      message: `Payment not verified (status: ${data.status})`,
      data,
    });
  } catch (error) {
    console.error(
      "❌ Verification error:",
      error.response?.data || error.message
    );
    next(createError(400, "Payment verification failed"));
  }
};
