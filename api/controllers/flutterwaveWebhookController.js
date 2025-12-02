// controllers/flutterwaveWebhookController.js
import User from "../models/userModel.js";

export const handleSubscriptionWebhook = async (req, res) => {
  const event = req.body;

  try {
    if (event.event === "subscription.charged") {
      const subscriptionId = event.data.id;
      const email = event.data.customer.email;

      const user = await User.findOne({ email });
      if (!user) return res.status(404).send("User not found");

      // Update last charge info
      user.vipSubscription.lastCharge = {
        amount: event.data.amount,
        currency: event.data.currency,
        status: event.data.status,
        chargedAt: new Date(),
      };
      await user.save();
      return res.status(200).send("Webhook processed");
    }

    if (event.event === "subscription.canceled") {
      const email = event.data.customer.email;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).send("User not found");

      user.vipSubscription.active = false;
      await user.save();
      return res.status(200).send("Subscription canceled");
    }

    res.status(200).send("Event ignored");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Webhook processing failed");
  }
};
