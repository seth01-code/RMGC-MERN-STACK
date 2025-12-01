import cron from "node-cron";
import axios from "axios";
import User from "../models/userModel.js";
import { encryptPayload } from "../utils/flutterwaveEncrypt.js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY;

// Runs every day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Running subscription renewal check...");

  const today = new Date();

  const users = await User.find({
    "vipSubscription.active": true,
    "vipSubscription.nextBillingDate": { $lte: today },
  });

  for (const user of users) {
    try {
      const sub = user.vipSubscription;

      if (!sub.cardToken) {
        console.warn(`⚠️ User ${user.email} has no card token`);
        continue;
      }

      const payload = {
        tx_ref: `RENEW-${Date.now()}-${user._id}`,
        amount: sub.amount,
        currency: sub.currency,
        email: user.email,
        token: sub.cardToken,
      };

      const encrypted = encryptPayload(payload, FLW_ENCRYPTION_KEY);

      const renewRes = await axios.post(
        "https://api.flutterwave.com/v3/charges?type=card",
        { client: encrypted },
        { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
      );

      if (renewRes.data.status === "success") {
        const now = new Date();
        const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        user.vipSubscription.startDate = now;
        user.vipSubscription.endDate = nextBilling;
        user.vipSubscription.nextBillingDate = nextBilling;

        await user.save();
        console.log(`✅ Auto-renew successful → ${user.email}`);
      } else {
        console.warn("❌ Auto-renew failed:", renewRes.data);
      }
    } catch (err) {
      console.error("Auto-renew error:", err.response?.data || err.message);
    }
  }
});
