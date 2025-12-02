// controllers/flutterwaveWebhookController.js
import User from "../models/userModel.js";

const FLW_HASH = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

export const handleFlutterwaveWebhook = async (req, res) => {
  try {
    const signature = req.headers["verif-hash"];
    if (!signature || signature !== FLW_HASH) {
      console.log("❌ Invalid Flutterwave signature");
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;
    console.log("🔥 Webhook received:", event);

    const eventType = event["event.type"] || event.event;

    // Handle card transactions (success & failed)
    if (eventType === "charge.completed" || eventType === "CARD_TRANSACTION") {
      const data = event.data;
      const tx_ref = data.tx_ref;
      const flw_ref = data.flw_ref;
      const email = data.customer?.email;

      const user = await User.findOne({
        "vipSubscription.subscriptionId": tx_ref,
      });

      if (!user) {
        console.log("⚠ User not found for tx_ref:", tx_ref);
        return res.status(404).send("User not found");
      }

      const isSuccessful = data.status === "successful";

      if (isSuccessful) {
        // Set start & end date on first successful charge
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        user.vipSubscription = {
          ...user.vipSubscription,
          active: true,
          startDate: now,
          endDate: endDate,
          transactionId: flw_ref,
          lastCharge: {
            amount: data.amount,
            currency: data.currency,
            status: data.status,
            chargedAt: new Date(data.created_at),
            processorResponse: data.processor_response,
            appFee: data.app_fee,
            merchantFee: data.merchant_fee,
          },
          cardToken: data.card?.token || user.vipSubscription.cardToken,
        };

        await user.save();
        console.log("✅ Successful charge processed for:", email);
        return res.status(200).send("Successful charge processed");
      } else {
        // Failed charge
        user.vipSubscription.lastCharge = {
          amount: data.amount,
          currency: data.currency,
          status: "failed",
          chargedAt: new Date(data.created_at),
          processorResponse: data.processor_response,
          appFee: data.app_fee,
          merchantFee: data.merchant_fee,
        };

        await user.save();
        console.log("⚠ Failed charge processed for:", email);
        return res.status(200).send("Failed charge processed");
      }
    }

    // Ignore other events
    return res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Webhook processing failed");
  }
};
