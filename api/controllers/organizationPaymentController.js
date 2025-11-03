import axios from "axios";
import createError from "../utils/createError.js";
import User from "../models/userModel.js";
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

    // Flutterwave test keys (no env for now)
    const FLW_PUBLIC = "FLWPUBK_TEST-a4ec3e8dfe4b6e3b7cecd44ec481a3f2-X";
    const FLW_SECRET = "FLWSECK_TEST-515b108d85989e44124b65d6ae479f2c-X";
    const FLW_ENCRYPTION = "FLWSECK_TESTe0dc650c2ddb";

    const payload = {
      tx_ref,
      amount: amountNGN,
      currency: currency || "NGN",
      redirect_url: "http://localhost:3000/payment-processing",
      payment_type: "card",
      card_number: cardNumber.replace(/\s/g, ""),
      cvv,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      email,
      fullname: fullName,
    };

    // Encrypt payload
    const encryptedPayload = encryptPayload(payload, FLW_ENCRYPTION);

    // Initiate payment
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

    // Store transaction reference temporarily
    user.vipSubscription = {
      active: false,
      paymentReference: tx_ref,
      gateway: "flutterwave",
    };
    await user.save();

    res.status(200).json({
      message: "Payment initiated, awaiting verification",
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

export const verifyOrganizationPayment = async (req, res, next) => {
  try {
    const { tx_ref } = req.body;
    if (!tx_ref) return res.status(400).json({ message: "tx_ref required" });

    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer FLWSECK_TEST-515b108d85989e44124b65d6ae479f2c-X`,
        },
      }
    );

    const { data } = verifyRes.data;

    // ✅ Treat test-approved transactions as success
    const isSuccessful =
      data.status === "successful" ||
      data.processor_response === "Approved. Successful";

    if (isSuccessful && data.amount === 50000 && data.currency === "NGN") {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        paymentReference: tx_ref,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      };

      await user.save();

      return res.status(200).json({
        message: "✅ Payment verified and subscription activated!",
        data,
      });
    }

    // Pending or failed
    res.status(400).json({
      message:
        "Payment not yet successful — waiting for OTP or final confirmation",
      data,
    });
  } catch (error) {
    console.error("❌ Error verifying payment:", error.response?.data || error);
    next(createError(500, "Internal server error"));
  }
};
