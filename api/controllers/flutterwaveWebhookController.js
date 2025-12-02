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

    if (eventType === "charge.completed" || eventType === "CARD_TRANSACTION") {
      const data = event.data;
      const meta = event.meta_data;

      // Flutterwave metadata fix
      const userId = meta?.userId;
      if (!userId) {
        console.log("⚠ No userId in meta_data");
        return res.status(400).send("Missing userId");
      }

      const user = await User.findById(userId);
      if (!user) {
        console.log("⚠ User not found:", userId);
        return res.status(404).send("User not found");
      }

      const isSuccessful = data.status === "successful";

      // --------------------------------------------------------
      // ⭐ STORE INVOICE FOR EVERY CHARGE
      // --------------------------------------------------------
      const invoice = {
        invoiceId: data.flw_ref,
        txRef: data.tx_ref,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        chargedAt: new Date(data.created_at),
        processorResponse: data.processor_response,
        appFee: data.app_fee,
        merchantFee: data.merchant_fee,
      };

      if (!user.vipSubscription.invoices) {
        user.vipSubscription.invoices = [];
      }

      user.vipSubscription.invoices.push(invoice);
      // --------------------------------------------------------

      if (isSuccessful) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        user.vipSubscription = {
          ...user.vipSubscription,
          active: true,
          startDate: now,
          endDate,
          transactionId: data.flw_ref,
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
        console.log("✅ Successful charge processed + invoice saved");
        return res.status(200).send("Successful charge processed");
      }

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
      console.log("⚠ Failed charge processed + invoice saved");
      return res.status(200).send("Failed charge processed");
    }

    return res.status(200).send("Event ignored");
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Webhook processing failed");
  }
};
