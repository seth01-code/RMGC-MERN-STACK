import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = "http://localhost:3000";
const PLAN_ID = "227759";
const BASE_AMOUNT_NGN = 52000;

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
    const { currency } = req.body; // e.g., NGN, USD, EUR
    const userId = req.user?.id;
    if (!userId) return next(createError(401, "Unauthorized"));

    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    const tx_ref = `ORG-${Date.now()}-${userId}`;

    // ------------------- Currency Conversion -------------------
    let amount = BASE_AMOUNT_NGN; // default NGN
    let convertedCurrency = "NGN";

    if (currency && currency !== "NGN") {
      try {
        const rateRes = await axios.get(
          `https://api.exchangerate.host/convert?from=NGN&to=${currency}&amount=${BASE_AMOUNT_NGN}`
        );
        amount = parseFloat(rateRes.data.result.toFixed(2));
        convertedCurrency = currency;
      } catch (err) {
        console.warn("⚠️ Currency conversion failed, defaulting to NGN", err);
      }
    }

    // ------------------- Set VIP subscription -------------------
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    user.vipSubscription = {
      active: true,
      gateway: "flutterwave",
      planId: PLAN_ID,
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
      payment_plan: PLAN_ID,
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
        plan: PLAN_ID,
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
