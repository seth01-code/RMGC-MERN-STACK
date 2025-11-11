import axios from "axios";
import User from "../models/userModel.js"; // Assuming this model structure
import createError from "../utils/createError.js"; // Assuming this utility
// Removed 'cron' as the preferred method is webhooks for ongoing status.
import crypto from "crypto";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_SECRET; // CRITICAL: This must be set for webhook security
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

// --- 1. Initiate Subscription (Payment Link Creation) ---

/**
 * Subscribe organization directly (recurring) via Flutterwave Payment Links.
 * This function initiates the payment flow and provides the checkout link.
 */
export const subscribeOrganization = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user || user.role !== "organization") {
      console.log("❌ Unauthorized subscription attempt");
      return next(createError(400, "Only organizations can subscribe"));
    }

    // MANDATORY CHECK: Ensure the secret key is loaded before proceeding
    if (!FLW_SECRET) {
      console.error("❌ FLW_SECRET is not set in environment variables.");
      return next(createError(500, "Server configuration error: Flutterwave secret key missing."));
    }

    const { amount = 1, currency = "USD", interval = "monthly" } = req.body;

    if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
      console.log("❌ Unsupported currency:", currency);
      return next(createError(400, "Unsupported currency"));
    }

    // Generate a unique reference for tracking the subscription creation
    const tx_ref = `ORG-SUB-${user._id}-${Date.now()}`;

    const payload = {
      // Amount must be an integer or float, but not excessively high precision
      amount: Number(amount).toFixed(2), 
      currency: currency.toUpperCase(),
      tx_ref: tx_ref, // Important for tracking!
      redirect_url: `${FRONTEND_URL}/org-processing`,
      payment_options: "card",
      customer: {
        email: user.email,
        name: user.fullname || user.username,
        // userId is crucial to link back when handling webhooks
        phonenumber: user.phone,
      },
      customizations: {
        title: "RMGC Organization Plan",
        description: "Recurring subscription",
        logo: "https://www.renewedmindsglobalconsult.com/assets/logoo-18848d4b.webp",
      },
      // This is correct for creating a recurring payment link
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

    if (data.status !== "success" || !data.data.link) {
      throw new Error("Subscription link creation failed");
    }

    // Recommended: Save the payment link ID and transaction ref to the user
    // or a dedicated 'SubscriptionAttempt' model for later verification if needed.
    // For now, we only return the link.

    return res.status(200).json({
      success: true,
      checkoutLink: data.data.link,
      // Note: data.data.id here is the Payment Link ID
      paymentLinkId: data.data.id, 
      txRef: tx_ref,
    });
  } catch (err) {
    // IMPROVED ERROR LOGGING: Logs the actual HTTP status code and error message from Flutterwave
    const status = err.response?.status;
    const errorDetails = err.response?.data?.message || err.response?.data || err.message;
    
    console.error(`❌ Subscription creation HTTP Error (${status || 'Unknown'}):`, errorDetails);

    // If the status is 401/403, it's almost certainly an API key issue.
    if (status === 401 || status === 403) {
      next(createError(500, "Subscription creation failed. Check your FLUTTERWAVE_SECRET_KEY for errors."));
    } else {
      next(createError(500, "Subscription creation failed. Check console for details."));
    }
  }
};

// --- 2. Webhook Handler (CRITICAL for recurring status) ---

/**
 * Handles incoming Flutterwave webhook events (e.g., successful charge,
 * subscription creation, failed renewal, cancellation).
 * This is the correct way to manage the ONGOING subscription status.
 */
export const handleFlutterwaveWebhook = async (req, res, next) => {
  // 1. VERIFY WEBHOOK SIGNATURE (SECURITY MANDATE)
  const hash = crypto.createHmac('sha256', FLW_WEBHOOK_HASH)
    .update(JSON.stringify(req.body))
    .digest('hex');

  const signature = req.headers['verif-hash'];

  if (signature !== hash) {
    console.warn("⚠️ Webhook received with invalid hash. Possible security breach.");
    // Respond with 200 OK to prevent Flutterwave from retrying, but log error.
    return res.status(200).end(); 
  }

  // 2. PROCESS WEBHOOK DATA
  const event = req.body;
  const eventType = event.event;
  const payload = event.data;

  console.log(`✅ Received Flutterwave Webhook Event: ${eventType}`);

  if (eventType === "charge.successful") {
    // This event fires for the initial payment and every successful recurring charge.
    
    // Check if the transaction is recurring (mandatory check for subscription logic)
    if (payload.is_recurring !== true) {
      console.log(`ℹ️ Non-recurring successful charge ignored.`);
      return res.status(200).end();
    }

    // Find the user based on the email (or a unique ID stored in metadata)
    const user = await User.findOne({ email: payload.customer.email });
    if (!user) {
      console.error(`❌ User not found for email: ${payload.customer.email}`);
      return res.status(200).end();
    }

    // Update user status
    user.vipSubscription = {
      active: true,
      gateway: "flutterwave",
      // Best practice: Store the actual Subscription ID if available from the transaction details
      // If only Payment Link ID is available, store that.
      subscriptionId: payload.payment_link_id || payload.subscription_id, 
      startDate: user.vipSubscription.startDate || new Date(payload.created_at),
      lastPaymentDate: new Date(payload.created_at),
      amount: payload.amount,
      currency: payload.currency,
      // You would calculate nextPaymentDate based on the plan interval here if Flutterwave doesn't provide it
    };

    await user.save();
    console.log(`✅ User VIP activated/renewed for: ${user.email}`);

  } else if (eventType === "subscription.cancelled" || eventType === "subscription.failed") {
    // This event fires if the subscription is manually cancelled or a renewal charge fails repeatedly.
    const user = await User.findOne({ email: payload.customer.email });

    if (user && user.vipSubscription?.active) {
      user.vipSubscription.active = false;
      // Optional: Add a reason for cancellation/failure
      user.vipSubscription.cancellationReason = eventType; 
      await user.save();
      console.log(`❌ User VIP deactivated due to ${eventType}: ${user.email}`);
    }
  }

  // Always respond with 200 OK to acknowledge the webhook and prevent retries.
  return res.status(200).end();
};

// --- 3. Initial Verification (Optional - Used for frontend redirect) ---

/**
 * Verify subscription via Payment Link and activate VIP status.
 * IMPORTANT: This should only be used immediately after the user completes 
 * the initial payment, before the webhook is processed. The webhook handler
 * is the reliable source of truth for ongoing status.
 */
export const verifyOrganizationSubscription = async (req, res, next) => {
  try {
    // The transaction_id is often passed back in the redirect_url as a query param
    // For this example, we assume either paymentLinkId (used in original code) or a transaction_id is passed
    const { paymentLinkId, transaction_id } = req.body; 

    // Verification by Transaction ID is more robust than by Payment Link ID after payment
    if (transaction_id) {
      // Step 1: Verify the transaction details
      const { data } = await axios.get(
        `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
        { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
      );

      if (data.status !== "success" || data.data.status !== "successful") {
        console.warn("⚠️ Transaction verification failed:", data);
        return res.status(400).json({ success: false, message: "Transaction failed." });
      }

      const txData = data.data;

      // Ensure it's the right transaction type (for a recurring initial payment)
      if (txData.payment_type !== "card" || txData.is_recurring !== true) {
        return res.status(400).json({ success: false, message: "Transaction is not a recurring card payment." });
      }
      
      const user = await User.findById(req.user?.id);
      if (!user) {
        console.log("❌ User not found during subscription verification");
        return next(createError(404, "User not found"));
      }

      // Step 2: Update user status after successful initial payment
      user.vipSubscription = {
        active: true,
        gateway: "flutterwave",
        // The actual Subscription ID is the best identifier to save
        subscriptionId: txData.subscription_id || paymentLinkId, 
        startDate: new Date(txData.created_at),
        lastPaymentDate: new Date(txData.created_at),
      };
      await user.save();

      console.log("✅ User VIP activated after initial payment:", user.email);

      return res.status(200).json({ success: true, user, txData });

    } else {
        return next(createError(400, "Transaction ID required for verification."));
    }
  } catch (err) {
    console.error(
      "❌ Initial subscription verification error:",
      err.response?.data || err.message
    );
    next(createError(500, "Subscription verification failed"));
  }
};

// NOTE ON CRON JOB: The original cron job logic is unreliable for ongoing subscription management.
// It would only check for the INITIAL successful transaction and keep the user active 
// even if subsequent charges fail. Replace it entirely with the Webhook Handler above.