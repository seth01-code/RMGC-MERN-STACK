import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = "http://localhost:3000";
const BASE_AMOUNT_NGN = 52000;

// Plan IDs per currency
const PLAN_IDS = {
  NGN: "227759",
  USD: "227761",
  EUR: "227762",
  GBP: "227763",
};

// ------------------- Helper: Rollover -------------------
const rolloverSubscription = (vipSubscription) => {
  const now = new Date();
  if (vipSubscription && vipSubscription.endDate) {
    const endDate = new Date(vipSubscription.endDate);
    if (now >= endDate) {
      vipSubscription.startDate = endDate;
      vipSubscription.endDate = new Date(
        endDate.getTime() + 30 * 24 * 60 * 60 * 1000
      );
    }
  }
  return vipSubscription;
};

// ------------------- Auto-rollover every hour -------------------
const startSubscriptionRolloverChecker = () => {
  setInterval(async () => {
    try {
      const users = await User.find({ "vipSubscription.active": true });
      for (const user of users) {
        const oldEnd = user.vipSubscription.endDate;
        const updated = rolloverSubscription(user.vipSubscription);
        if (oldEnd !== updated.endDate) {
          user.vipSubscription = updated;
          await user.save();
          console.log(`✅ Rolled over VIP for: ${user.email}`);
        }
      }
    } catch (err) {
      console.error("❌ Rollover error:", err.message);
    }
  }, 3600000);
};

startSubscriptionRolloverChecker();

// -----------------------------------------------------------------
// ------------------- CREATE SUBSCRIPTION (INITIAL PAYMENT) --------
// -----------------------------------------------------------------
export const createOrganizationSubscription = async (req, res, next) => {
  try {
    const { currency } = req.body; // e.g., NGN, USD, EUR, GBP
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    const tx_ref = `ORG-${Date.now()}-${userId}`;

    // ------------------- Determine plan ID -------------------
    const planId = PLAN_IDS[currency] || PLAN_IDS["NGN"];
    let amount = BASE_AMOUNT_NGN;
    let convertedCurrency = currency || "NGN";

    // ------------------- Currency conversion if not NGN -------------------
    if (convertedCurrency !== "NGN") {
      try {
        const rateRes = await axios.get(
          `https://open.er-api.com/v6/latest/NGN`
        );
        const rate = rateRes.data.rates[convertedCurrency];
        if (rate) {
          amount = parseFloat((BASE_AMOUNT_NGN * rate).toFixed(2));
        } else {
          convertedCurrency = "NGN";
          amount = BASE_AMOUNT_NGN;
        }
      } catch (err) {
        console.warn("⚠️ Currency conversion failed, defaulting to NGN", err);
        convertedCurrency = "NGN";
        amount = BASE_AMOUNT_NGN;
      }
    }

    // ------------------- Set VIP subscription -------------------
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    user.vipSubscription = {
      active: true,
      gateway: "flutterwave",
      planId: planId,
      subscriptionId: tx_ref,
      startDate: now,
      endDate: endDate,
      currency: convertedCurrency,
      amount: amount,
    };

    await user.save();

    // ------------------- Initiate Flutterwave payment -------------------
    const payload = {
      tx_ref,
      amount,
      currency: convertedCurrency,
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
        plan: planId,
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
        message: "Subscription activated and payment initialized",
        checkoutLink: flwRes.data.data.link,
        vipSubscription: user.vipSubscription,
      });
    }

    throw new Error("Unable to initialize Flutterwave payment");
  } catch (err) {
    console.error(
      "❌ Subscription creation error:",
      err.response?.data || err.message
    );
    next(createError(500, "Subscription creation failed"));
  }
};
