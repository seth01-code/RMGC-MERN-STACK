// controllers/organizationSubscriptionController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = "http://localhost:3000";
const BASE_AMOUNT_NGN = 52000;

// Plan IDs per currency (hardcoded or fetched dynamically)
const PLAN_IDS = {
  NGN: "227759",
  USD: "227761",
  EUR: "227762",
  GBP: "227763",
};

// ------------------- CREATE SUBSCRIPTION (INITIAL PAYMENT) --------
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    let { currency } = req.body;
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    currency = (currency || "NGN").toUpperCase();
    const planId = PLAN_IDS[currency] ?? PLAN_IDS["NGN"];
    const planCurrency = Object.keys(PLAN_IDS).includes(currency)
      ? currency
      : "NGN";

    // Convert amount if currency is not NGN
    let amount = BASE_AMOUNT_NGN;
    if (planCurrency !== "NGN") {
      try {
        const rateRes = await axios.get(`https://open.er-api.com/v6/latest/NGN`);
        const rate = rateRes.data.rates[planCurrency];
        if (rate) amount = parseFloat((BASE_AMOUNT_NGN * rate).toFixed(2));
      } catch (err) {
        console.warn("⚠️ Currency conversion failed, defaulting to NGN", err);
      }
    }

    const tx_ref = `ORG-${Date.now()}-${userId}`;

    // ------------------- Set initial vipSubscription (inactive) -------------------
    user.vipSubscription = {
      active: false, // will be updated on successful payment
      gateway: "flutterwave",
      planId: planId,
      subscriptionId: tx_ref,
      currency: planCurrency,
      amount: amount,
    };

    await user.save();

    // ------------------- Flutterwave payment payload -------------------
    const payload = {
      tx_ref,
      amount,
      currency: planCurrency,
      redirect_url: `${FRONTEND_URL}/organization/dashboard`,
      payment_options: "card",
      payment_plan: planId,
      customer: {
        email: user.email,
        name: user.fullname || user.username,
      },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Initial payment for recurring subscription",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      meta: {
        planId,
        currency: planCurrency,
        userId,
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
      return res.status(200).json({
        success: true,
        message: "Subscription payment initialized",
        checkoutLink: flwRes.data.data.link,
        vipSubscription: user.vipSubscription,
      });
    }

    throw new Error("Unable to initialize Flutterwave payment");
  } catch (err) {
    console.error("❌ Subscription creation error:", err.response?.data || err.message);
    next(createError(500, "Subscription creation failed"));
  }
};
