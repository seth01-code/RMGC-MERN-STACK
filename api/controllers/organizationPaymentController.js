import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import cron from "node-cron";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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
 * Subscribe organization directly (recurring) via Flutterwave Payment Links
 */
export const subscribeOrganization = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user || user.role !== "organization") {
      console.log("❌ Unauthorized subscription attempt");
      return next(createError(400, "Only organizations can subscribe"));
    }

    const { amount = 1, currency = "USD", interval = "monthly" } = req.body;

    if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
      console.log("❌ Unsupported currency:", currency);
      return next(createError(400, "Unsupported currency"));
    }

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
        interval, // daily, weekly, monthly
      },
    };

    console.log("ℹ️ Sending subscription request to Flutterwave:", payload);

    const { data } = await axios.post(
      "https://api.flutterwave.com/v3/payment-links",
      payload,
      {
        headers: { Authorization: `Bearer ${FLW_SECRET}` },
      }
    );

    console.log("✅ Flutterwave subscription response:", data);

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
 * Verify subscription via Payment Link and activate VIP
 */
export const verifyOrganizationSubscription = async (req, res, next) => {
  try {
    const { subscription_id } = req.body;
    if (!subscription_id) {
      console.log("❌ Subscription ID missing in verification request");
      return next(createError(400, "Subscription ID required"));
    }

    console.log(
      "ℹ️ Verifying subscription with Payment Link ID:",
      subscription_id
    );

    const { data } = await axios.get(
      `https://api.flutterwave.com/v3/payment-links/${subscription_id}`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );

    console.log("ℹ️ Payment Link details fetched:", data);

    if (data.status !== "success") {
      console.warn("⚠️ Payment Link not found or inactive:", data);
      return res.status(400).json({ success: false, linkData: data });
    }

    const linkData = data.data;
    const transactions = linkData.usage?.transactions || [];
    const successfulTx = transactions.find((tx) => tx.status === "successful");

    if (!successfulTx) {
      console.log("⚠️ No successful transaction yet for this subscription");
      return res.status(400).json({ success: false, linkData });
    }

    const user = await User.findById(req.user?.id);
    if (!user) {
      console.log("❌ User not found during subscription verification");
      return next(createError(404, "User not found"));
    }

    user.vipSubscription = {
      active: true,
      gateway: "flutterwave",
      subscriptionId: subscription_id,
      startDate: new Date(successfulTx.created_at),
      nextPaymentDate: null, // You can calculate manually if needed
    };

    await user.save();

    console.log("✅ User VIP activated:", user.email);

    return res.status(200).json({ success: true, user, linkData });
  } catch (err) {
    console.error(
      "❌ Subscription verification error:",
      err.response?.data || err.message
    );
    next(createError(500, "Subscription verification failed"));
  }
};

/**
 * Daily cron job to auto-verify active subscriptions
 */
cron.schedule("0 0 * * *", async () => {
  console.log("🕒 Running daily subscription verification cron job...");
  const users = await User.find({ "vipSubscription.active": true });
  console.log(`ℹ️ Found ${users.length} active VIP subscriptions`);

  for (const user of users) {
    try {
      console.log(`ℹ️ Verifying subscription for user: ${user.email}`);
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
