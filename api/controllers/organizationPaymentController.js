// controllers/organizationSubscriptionController.js
import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

const FLW_SECRET = process.env.FLUTTERWAVE_LIVE_SECRET_KEY;
const FRONTEND_URL = "http://localhost:3000";
const BASE_AMOUNT_NGN = 50;

// Plan IDs per currency (hardcoded or fetched dynamically)
const PLAN_IDS = {
  NGN: "151051",
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

    currency = "NGN"; // force NGN
    const planId = PLAN_IDS.NGN;
    const amount = BASE_AMOUNT_NGN;

    const tx_ref = `ORG-${Date.now()}-${userId}`;

    // Set initial vipSubscription
    user.vipSubscription = {
      active: false,
      gateway: "flutterwave",
      planId: planId,
      subscriptionId: tx_ref,
      currency,
      amount,
    };

    await user.save();

    // Flutterwave payment payload
    const payload = {
      tx_ref,
      amount,
      currency,
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
      meta: { planId, currency, userId },
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
    console.error(
      "❌ Subscription creation error:",
      err.response?.data || err.message
    );
    next(createError(500, "Subscription creation failed"));
  }
};
