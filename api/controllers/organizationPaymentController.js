import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;

const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "KES", "GHS", "ZAR"];

// 💱 Fixed approximate exchange rates to maintain ₦50,000 equivalent
const FX_RATES = {
  NGN: 1,
  USD: 0.00065, // ≈ $32.5
  GBP: 0.00052, // ≈ £26
  EUR: 0.0006, // ≈ €30
  KES: 0.093, // ≈ KSh 4650
  GHS: 0.0092, // ≈ ₵460
  ZAR: 0.012, // ≈ R600
};

// 💳 Step 1 — Create Flutterwave Checkout Link
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization") {
      return next(createError(400, "Only organizations can subscribe"));
    }

    // Receive currency and amount from frontend
    let { currency, amount } = req.body;

    currency = (currency || "USD").toUpperCase();

    const SUPPORTED_CURRENCIES = [
      "NGN",
      "USD",
      "GBP",
      "EUR",
      "KES",
      "GHS",
      "ZAR",
      "UGX",
      "TZS",
    ];
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      console.warn(`⚠️ Unsupported currency "${currency}", defaulting to USD`);
      currency = "USD";
    }

    // Ensure amount is a number
    amount = Number(amount);
    if (!amount || amount <= 0) return next(createError(400, "Invalid amount"));

    const tx_ref = `ORG-${Date.now()}-${userId}`;

    // Flutterwave checkout payload
    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `http://localhost:3000/org-processing`,
      payment_options: "card", // Force card only
      customer: {
        email: user.email,
        name: user.fullname || user.username || "Organization User",
      },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Access to job posting and premium organization features",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      meta: {
        card_only: true, // extra safety
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
        amount,
        currency,
      });
    }

    throw new Error("Unable to initialize payment");
  } catch (error) {
    console.error(
      "❌ Payment initialization error:",
      error.response?.data || error.message
    );
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
      data.currency &&
      Number(data.amount) > 0
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
        currency: data.currency,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      };

      await user.save();
      console.log(`🎉 VIP activated for ${user.email} (${data.currency})`);

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
    console.error(
      "❌ Verification error:",
      error.response?.data || error.message
    );
    next(createError(400, "Payment verification failed"));
  }
};
