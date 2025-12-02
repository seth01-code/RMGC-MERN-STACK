// controllers/flutterwaveWebhookController.js
import crypto from "crypto";
import User from "../models/userModel.js";

const FLW_HASH = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

export const handleFlutterwaveWebhook = async (req, res) => {
  try {
    const signature = req.headers["verif-hash"];

    // Verify Flutterwave webhook signature
    if (!signature || signature !== FLW_HASH) {
      console.log("❌ Invalid Flutterwave signature");
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    console.log("🔥 Webhook received:", event);

    const eventType = event["event.type"] || event.event;

    // -------------------------
    // ✅ Successful charge (includes recurring)
    // -------------------------
    if (
      eventType === "CARD_TRANSACTION" &&
      event.data.status === "successful"
    ) {
      const email = event.data.customer.email;
      const tx_ref = event.data.tx_ref;

      const user = await User.findOne({
        "vipSubscription.subscriptionId": tx_ref,
      });
      if (!user) {
        console.log("⚠ User not found for tx_ref:", tx_ref);
        return res.status(404).send("User not found");
      }

      // Update subscription charge log
      user.vipSubscription.lastCharge = {
        amount: event.data.amount,
        currency: event.data.currency,
        status: event.data.status,
        chargedAt: new Date(event.data.created_at),
      };

      // Save card token if present for recurring billing
      if (event.data.card && event.data.card.token) {
        user.cardToken = event.data.card.token;
      }

      await user.save();

      console.log("✅ Charge saved for:", email);
      return res.status(200).send("Charge processed");
    }

    // -------------------------
    // ❌ Failed auto debit
    // -------------------------
    if (eventType === "CARD_TRANSACTION" && event.data.status === "failed") {
      const email = event.data.customer.email;

      const user = await User.findOne({ email });
      if (!user) return res.status(404).send("User not found");

      user.vipSubscription.lastCharge = {
        amount: event.data.amount,
        currency: event.data.currency,
        status: "failed",
        chargedAt: new Date(event.data.created_at),
      };

      await user.save();
      console.log("⚠ Auto debit failed for:", email);

      return res.status(200).send("Failed charge handled");
    }

    return res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Webhook processing failed");
  }
};
