// utils/sendSubscriptionReceipt.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendSubscriptionReceipt = async ({
  email,
  username,
  role,
  currency,
  amount,
  subscriptionType,
}) => {
  try {
    console.log(`📧 Sending Subscription Receipt to ${email}...`);

    const subject = `💳 ${subscriptionType} Subscription Activated!`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px;">
        <div style="background:#FFA500; color:#fff; padding:15px; text-align:center; border-radius:10px 10px 0 0;">
          <h2>${subject}</h2>
        </div>
        <div style="padding:20px; color:#333;">
          <p>Dear <b>${username}</b>,</p>
          <p>Your <b>${subscriptionType}</b> subscription has been successfully activated! ✅</p>
          <ul style="background:#f9f9f9; padding:15px; border-radius:5px; color:#555;">
            <li>💰 Amount: ${currency} ${amount}</li>
            <li>📅 Plan: Yearly</li>
          </ul>
          <p>Thank you for subscribing! You can now access all the benefits of your plan.</p>
          <p>Best regards,<br><b>The Renewed Minds Global Consult Team</b></p>
        </div>
        <div style="background:#FFA500; color:#fff; text-align:center; padding:10px; font-size:12px; border-radius:0 0 10px 10px;">
          &copy; ${new Date().getFullYear()} Renewed Minds Global Consult. All rights reserved.
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Renewed Minds Global Consult" <no-reply@renewedmindsglobalconsult.com>`,
      to: email,
      subject,
      html: emailBody,
    });

    console.log(`✅ Subscription Receipt sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send Subscription Receipt to ${email}:`, error);
  }
};
