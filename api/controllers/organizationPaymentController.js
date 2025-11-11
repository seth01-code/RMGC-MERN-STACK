import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import cron from "node-cron";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = "http://localhost:3000";

// Supported currencies
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

/**
 * Step 1: Create a Flutterwave plan (for recurring subscription)
 * Use interval = "daily" now
 */
export const createOrganizationPlan = async (req, res, next) => {
  try {
    const { amount = 1, currency = "USD" } = req.body;

    if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
      console.error("❌ Unsupported currency:", currency);
      return next(createError(400, "Unsupported currency"));
    }

    const payload = {
      name: `ORG-PLAN-${Date.now()}`,
      amount: Number(amount),
      interval: "daily", // For testing. Use "monthly" in production
      currency: currency.toUpperCase(),
      duration: 12,
    };

    console.log("ℹ️ Creating Flutterwave plan with payload:", payload);

    const flwRes = await axios.post(
      "https://api.flutterwave.com/v3/plans", // <-- Correct endpoint
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Flutterwave plan response:", flwRes.data);

    if (flwRes.data.status === "success") {
      return res.status(200).json({ success: true, plan: flwRes.data.data });
    }

    console.error("❌ Plan creation failed, response:", flwRes.data);
    throw new Error("Plan creation failed");
  } catch (err) {
    console.error("❌ Plan creation error:", err.response?.data || err.message);
    next(createError(500, "Plan creation failed"));
  }
};


/**
 * Step 2: Subscribe an organization to a plan
 */
export const subscribeOrganization = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);

    if (!user || user.role !== "organization") {
      console.error("❌ User not found or not organization:", userId);
      return next(createError(400, "Only organizations can subscribe"));
    }

    const { plan_id } = req.body;
    if (!plan_id) {
      console.error("❌ No plan_id provided in request body");
      return next(createError(400, "Plan ID required"));
    }

    const payload = {
      plan: plan_id,
      customer: {
        email: user.email,
        name: user.fullname || user.username,
      },
      payment_options: "card",
      customizations: {
        title: "RMGC Organization Plan",
        description: "Recurring subscription",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      redirect_url: `${FRONTEND_URL}/org-processing`,
      meta: { card_only: true },
    };

    console.log("ℹ️ Creating subscription with payload:", payload);

    const flwRes = await axios.post(
      "https://api.flutterwave.com/v3/subscriptions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Subscription response:", flwRes.data);

    if (flwRes.data.status === "success") {
      return res.status(200).json({
        success: true,
        checkoutLink: flwRes.data.data.payment_link,
        subscriptionId: flwRes.data.data.id,
      });
    }

    console.error("❌ Subscription creation failed, response:", flwRes.data);
    throw new Error("Subscription creation failed");
  } catch (err) {
    console.error("❌ Subscription error:", err.response?.data || err.message);
    next(createError(500, "Subscription creation failed"));
  }
};

/**
 * Step 3: Verify subscription and activate VIP
 */
export const verifyOrganizationSubscription = async (req, res, next) => {
  try {
    const { subscription_id } = req.body;
    if (!subscription_id) {
      console.error("❌ Subscription ID required for verification");
      return next(createError(400, "Subscription ID required"));
    }

    console.log("ℹ️ Verifying subscription:", subscription_id);

    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/subscriptions/${subscription_id}`,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Subscription verification response:", verifyRes.data);

    const subscription = verifyRes.data.data;

    if (subscription.status === "active") {
      const user = await User.findById(req.user?.id);
      if (!user) {
        console.error("❌ User not found for subscription verification");
        return next(createError(404, "User not found"));
      }

      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        subscriptionId: subscription.id,
        startDate: new Date(subscription.start_date),
        nextPaymentDate: new Date(subscription.next_payment_date),
      };

      await user.save();

      return res.status(200).json({ success: true, subscription });
    }

    console.warn("⚠️ Subscription not active yet:", subscription);
    return res.status(400).json({ success: false, subscription });
  } catch (err) {
    console.error(
      "❌ Subscription verification error:",
      err.response?.data || err.message
    );
    next(createError(500, "Subscription verification failed"));
  }
};

/**
 * Step 4: Cron job to auto-verify subscriptions daily
 */
cron.schedule("0 0 * * *", async () => {
  console.log("🕒 Running daily subscription verification cron job...");
  const users = await User.find({ "vipSubscription.active": true });

  for (const user of users) {
    try {
      await verifyOrganizationSubscription(
        {
          body: { subscription_id: user.vipSubscription.subscriptionId },
          user,
        },
        { status: () => ({ json: console.log }) },
        () => {}
      );
    } catch (err) {
      console.error("❌ Cron verification error:", err.message);
    }
  }
});
