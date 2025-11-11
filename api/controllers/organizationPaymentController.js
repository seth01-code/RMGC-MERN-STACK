import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import cron from "node-cron";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = "http://localhost:3000";

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
 * Subscribe organization directly (recurring)
 */
export const subscribeOrganization = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user || user.role !== "organization") {
      return next(createError(400, "Only organizations can subscribe"));
    }

    const { amount = 1, currency = "USD", interval = "monthly" } = req.body;

    if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
      return next(createError(400, "Unsupported currency"));
    }

    // Flutterwave subscription payload
    const payload = {
      amount: Number(amount),
      currency: currency.toUpperCase(),
      redirect_url: `${FRONTEND_URL}/org-processing`,
      payment_options: "card",
      customer: {
        email: user.email,
        name: user.fullname || user.username,
      },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Recurring subscription",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      recurring: {
        interval: interval, // daily, weekly, monthly...
      },
    };

    const { data } = await axios.post(
      "https://api.flutterwave.com/v3/payment-links",
      payload,
      {
        headers: { Authorization: `Bearer ${FLW_SECRET}` },
      }
    );

    if (data.status !== "success")
      throw new Error("Subscription creation failed");

    return res.status(200).json({
      success: true,
      checkoutLink: data.data.link,
      subscriptionId: data.data.id,
    });
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

    const { data } = await axios.get(
      `https://api.flutterwave.com/v3/subscriptions/${subscription_id}`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    if (data.status !== "success") {
      console.warn("⚠️ Subscription not active:", data);
      return res.status(400).json({ success: false, subscription: data });
    }

    const subscription = data.data;
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
 * Step 4: Daily cron job to auto-verify active subscriptions
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
