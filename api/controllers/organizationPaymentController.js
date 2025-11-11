import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import cron from "node-cron";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL =  "http://localhost:3000";

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
 * Use interval = "minute" for testing purposes (sandbox only)
 */
export const createOrganizationPlan = async (req, res, next) => {
  try {
    const { amount = 1, currency = "USD", interval = "minute" } = req.body;

    if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
      return next(createError(400, "Unsupported currency"));
    }

    const payload = {
      name: `ORG-PLAN-${Date.now()}`,
      amount,
      interval, // "minute" works in sandbox; "monthly" for production
      currency,
      duration: 12, // total cycles, optional
    };

    const planRes = await axios.post(
      "https://api.flutterwave.com/v3/plans",
      payload,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    if (planRes.data.status === "success") {
      return res.status(200).json({ success: true, plan: planRes.data.data });
    }

    throw new Error("Plan creation failed");
  } catch (err) {
    console.error("❌ Plan creation error:", err.response?.data || err.message);
    next(createError(500, "Plan creation failed"));
  }
};

/**
 * Step 2: Subscribe an organization to a plan
 * Forces card-only payments
 */
export const subscribeOrganization = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user || user.role !== "organization")
      return next(createError(400, "Only organizations can subscribe"));

    const { plan_id } = req.body;
    if (!plan_id) return next(createError(400, "Plan ID required"));

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

    const flwRes = await axios.post(
      "https://api.flutterwave.com/v3/subscriptions",
      payload,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    if (flwRes.data.status === "success") {
      return res.status(200).json({
        success: true,
        checkoutLink: flwRes.data.data.payment_link,
        subscriptionId: flwRes.data.data.id,
      });
    }

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
    if (!subscription_id)
      return next(createError(400, "Subscription ID required"));

    const verifyRes = await axios.get(
      `https://api.flutterwave.com/v3/subscriptions/${subscription_id}`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    const subscription = verifyRes.data.data;

    if (subscription.status === "active") {
      const user = await User.findById(req.user?.id);
      if (!user) return next(createError(404, "User not found"));

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
 * Step 4: Optional cron job to auto-verify active subscriptions every minute
 */
cron.schedule("* * * * *", async () => {
  console.log("🕒 Running subscription verification cron job...");
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
      console.error("Cron verification error:", err.message);
    }
  }
});
