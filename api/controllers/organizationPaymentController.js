import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import { encryptPayload } from "../utils/flutterwaveEncrypt.js";
import qs from "qs";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY; // Flutterwave 3DES key
const FRONTEND_URL = "http://localhost:3000";

const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "KES", "GHS", "ZAR"];
const BASE_AMOUNT_NGN = 50000;
const FEE_PERCENT = 7.5; // 7.5% fee

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

    // Add 7.5% fee
    const amount =
      Math.round(
        BASE_AMOUNT_NGN * exchangeRate * (1 + FEE_PERCENT / 100) * 100
      ) / 100;

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

// 💳 FIXED — Step 2: Verify Payment & Activate Subscription
export const verifyOrganizationPayment = async (req, res, next) => {
  try {
    const { tx_ref } = req.body;
    if (!tx_ref) return next(createError(400, "Missing transaction reference"));

    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`,
      {
        headers: { Authorization: `Bearer ${FLW_SECRET}` },
      }
    );

    const { data } = verifyRes.data;
    const status = data.status?.toLowerCase();

    if (status !== "successful")
      return next(createError(400, "Payment not successful"));

    const user = await User.findById(req.user?.id);
    if (!user) return next(createError(404, "User not found"));

    const cardToken = data.card?.token || null;

    const now = new Date();
    const endDate = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute test

    user.vipSubscription = {
      active: true,
      gateway: "flutterwave",
      paymentReference: data.tx_ref,
      transactionId: data.id,
      amount: data.amount,
      currency: data.currency,
      cardToken,
      startDate: now,
      endDate,
    };

    await user.save();

    console.log(`🎉 VIP ACTIVATED for ${user.email}`);
    console.log("⏳ Auto-renew will run in 1 minute...");

    // --------------------------------------------------------------------
    // ⚡ ONE-MINUTE AUTO-RENEW TEST (Simulated Subscription)
    // --------------------------------------------------------------------
    setTimeout(async () => {
      try {
        console.log("🔁 Running TEST AUTO-RENEW for:", user.email);

        if (!user.vipSubscription.cardToken) {
          return console.log("⚠️ No card token — cannot auto renew");
        }

        const chargePayload = {
          tx_ref: `RENEW-${Date.now()}-${user._id}`,
          amount: user.vipSubscription.amount,
          currency: user.vipSubscription.currency,
          email: user.email,
          token: user.vipSubscription.cardToken,
        };

        const encrypted = encryptPayload(chargePayload, process.env.FLW_ENCRYPTION_KEY);

        const renewRes = await axios.post(
          "https://api.flutterwave.com/v3/charges?type=card",
          { client: encrypted },
          {
            headers: {
              Authorization: `Bearer ${FLW_SECRET}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("🔍 Auto-renew response:", renewRes.data);

        if (renewRes.data.status === "success") {
          const renewStart = new Date();
          const renewEnd = new Date(renewStart.getTime() + 1 * 60 * 1000);

          user.vipSubscription.startDate = renewStart;
          user.vipSubscription.endDate = renewEnd;
          await user.save();

          console.log(`✅ AUTO-RENEW SUCCESS: ${user.email}`);
        } else {
          console.log("❌ AUTO-RENEW FAILED:", renewRes.data);
        }
      } catch (err) {
        console.error(
          "❌ AUTO-RENEW ERROR:",
          err.response?.data || err.message
        );
      }
    }, 60 * 1000); // <-- runs 1 minute after activation

    // --------------------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "VIP activated — Auto-renew test in 1 minute",
      data,
    });
  } catch (error) {
    console.error(
      "❌ Verification error:",
      error.response?.data || error.message
    );
    next(createError(500, "Payment verification failed"));
  }
};
