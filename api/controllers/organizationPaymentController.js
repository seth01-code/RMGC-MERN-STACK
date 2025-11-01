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

    // Flutterwave keys (no env for now)
    const FLW_PUBLIC = "FLWPUBK_TEST-a4ec3e8dfe4b6e3b7cecd44ec481a3f2-X";
    const FLW_SECRET = "FLWSECK_TEST-515b108d85989e44124b65d6ae479f2c-X";
    const FLW_ENCRYPTION = "FLWSECK_TESTe0dc650c2ddb";

    // Prepare payment payload
    const payload = {
      tx_ref,
      amount: amountNGN,
      currency: "NGN",
      redirect_url: "http://localhost:3000/payment-processing",
      payment_type: "card",
      card_number: cardNumber.replace(/\s/g, ""),
      cvv,
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
      email,
      fullname: fullName,
    };

    // Encrypt payload with the encryption key
    const encryptedPayload = encryptPayload(payload, FLW_ENCRYPTION);

    // Send encrypted payload to Flutterwave
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

    // Save subscription status
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

export const verifyOrganizationPayment = async (req, res, next) => {
  try {
    const { tx_ref } = req.body; // tx_ref sent from frontend
    const userId = req.user?.id; // assuming you already have user in auth middleware

    if (!tx_ref)
      return res
        .status(400)
        .json({ message: "Transaction reference is required" });

    // Step 1: Fetch transaction by reference
    const txRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions?tx_ref=${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const transactions = txRes.data.data;
    if (!transactions || transactions.length === 0)
      return res.status(404).json({ message: "Transaction not found" });

    const transaction = transactions[0];

    // Step 2: Verify by ID
    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction.id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    const { data } = verifyRes.data;

    // Step 3: Confirm successful payment
    if (
      data.status === "successful" &&
      data.amount === 50000 &&
      data.currency === "NGN"
    ) {
      // Update the user’s VIP subscription
      const user = await User.findById(userId);
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
        message: "Payment verified and VIP subscription activated ✅",
        data,
      });
    }

    return res.status(400).json({
      message: "Payment not verified yet",
      data,
    });
  } catch (error) {
    console.error("❌ Error verifying payment:", error.response?.data || error);
    next(createError(500, "Internal server error"));
  }
};
