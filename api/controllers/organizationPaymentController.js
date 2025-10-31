import axios from "axios";
import User from "../models/user.model.js";
import createError from "../utils/createError.js";

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
    const userId = req.user?.id; // must come from auth middleware

    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization") {
      return next(createError(400, "Only organizations can subscribe"));
    }

    // Base plan info
    const amountNGN = 50000; // ₦50,000 yearly
    const tx_ref = `ORG-${Date.now()}-${userId}`;
    const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

    // Call Flutterwave charge endpoint
    const response = await axios.post(
      "https://api.flutterwave.com/v3/charges?type=card",
      {
        tx_ref,
        amount: amountNGN,
        currency: "NGN", // Flutterwave auto converts if card currency differs
        redirect_url: "http://localhost:3000/payment-processing",
        payment_type: "card",
        card_number: cardNumber,
        cvv,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        email,
        fullname: fullName,
        authorization: {
          mode: "pin", // optional if your account requires PIN
        },
      },
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

    // Optionally store transaction details
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
