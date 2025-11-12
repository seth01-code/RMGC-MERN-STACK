import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import { encryptPayload } from "../utils/flutterwaveEncrypt.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY; // correct key
const FRONTEND_URL = "http://localhost:3000";

const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "KES", "GHS", "ZAR"];
const BASE_AMOUNT_NGN = 50000;

// ✅ Fetch exchange rate
const getExchangeRate = async (currency) => {
  try {
    if (currency === "NGN") return 1;
    const res = await axios.get("https://open.er-api.com/v6/latest/USD");
    const rates = res.data?.rates || {};
    const usdToCurrency = rates[currency];
    const usdToNgn = rates["NGN"];
    if (!usdToCurrency || !usdToNgn) return 1;
    return usdToCurrency / usdToNgn;
  } catch (error) {
    console.error("⚠️ Exchange rate fetch failed:", error.message);
    return 1;
  }
};

// 💳 Step 1 — Create Flutterwave checkout
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    let { currency } = req.body;
    currency = (currency || "USD").toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(currency)) currency = "USD";

    const exchangeRate = await getExchangeRate(currency);
    const amount = Math.round(BASE_AMOUNT_NGN * exchangeRate * 100) / 100;

    const tx_ref = `ORG-${Date.now()}-${userId}`;

    const payload = {
      tx_ref,
      amount,
      currency,
      redirect_url: `${FRONTEND_URL}/org-processing`,
      payment_options: "card",
      customer: { email: user.email, name: user.fullname || user.username },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Premium org features",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      meta: { card_only: true },
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
      return res.status(200).json({
        success: true,
        checkoutLink: flwRes.data.data.link,
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

// 💳 Step 2 — Verify payment & setup auto-renew
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

      const now = new Date();
      const endDate = new Date(now.getTime() + 1 * 60 * 1000); // 1 min test

      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        paymentReference: data.tx_ref,
        transactionId: data.id,
        amount: data.amount,
        currency: data.currency,
        cardToken: data.card?.token, // auto-renew token
        startDate: now,
        endDate,
      };

      await user.save();
      console.log(`🎉 VIP activated for ${user.email} (${data.currency})`);

      // 🔁 Auto-renew after 1 minute (test)
      setTimeout(async () => {
        try {
          console.log(`🔁 Auto-renew attempt for ${user.email}`);
          const rate = await getExchangeRate(data.currency);
          const newAmount = Math.round(BASE_AMOUNT_NGN * rate * 100) / 100;

          const chargePayload = {
            amount: newAmount,
            currency: data.currency,
            email: user.email,
            tx_ref: `RENEW-${Date.now()}-${user._id}`,
            authorization: { mode: "tokenized", token: user.vipSubscription.cardToken },
          };

          const encryptedPayload = encryptPayload(chargePayload, FLW_ENCRYPTION_KEY);

          const renewRes = await axios.post(
            "https://api.flutterwave.com/v3/charges?type=card",
            { client: encryptedPayload },
            { headers: { Authorization: `Bearer ${FLW_SECRET}`, "Content-Type": "application/json" } }
          );

          if (renewRes.data.status === "success") {
            const newStart = new Date();
            const newEnd = new Date(newStart.getTime() + 1 * 60 * 1000); // 1 min test
            user.vipSubscription.startDate = newStart;
            user.vipSubscription.endDate = newEnd;
            user.vipSubscription.amount = newAmount;
            await user.save();
            console.log(`✅ Auto-renew successful for ${user.email}`);
          } else {
            console.warn("⚠️ Auto-renew failed:", renewRes.data);
          }
        } catch (err) {
          console.error("❌ Auto-renew error:", err.response?.data || err.message);
        }
      }, 60 * 1000);

      return res.status(200).json({
        success: true,
        message: "✅ Payment verified — VIP activated (1 minute test)",
        data,
      });
    }

    console.warn("🚫 Payment not successful or pending:", status);
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
