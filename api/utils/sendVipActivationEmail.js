import transporter from "./transporter.js"; // adjust path as needed

export const sendVipActivationEmail = async (email, fullName) => {
  console.log(`📧 Sending VIP Activation Email to ${email}...`);

  try {
    const subject =
      "🎉 Your VIP Access Has Been Activated – Explore Premium Remote Jobs!";

    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; 
      border: 1px solid #ddd; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
        
        <div style="background: #FFA500; color: #fff; padding: 15px; text-align: center; border-top-left-radius: 10px; border-top-right-radius: 10px;">
          <h1>${subject}</h1>
        </div>

        <div style="padding: 20px; color: #333;">
          <p>Hi <b>${fullName}</b>,</p>

          <p>Welcome to the <b>VIP Tier</b> of <b>Renewed Minds Global Consult</b>! 🌟</p>

          <p>Your upgrade was successful, and you now have full access to:</p>

          <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
            <li>💼 Exclusive high-paying remote job listings</li>
            <li>📈 Priority visibility to hiring organizations</li>
            <li>🔔 Instant alerts for new opportunities</li>
            <li>🎯 Access to all professional categories and job tiers</li>
          </ul>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.renewedmindsglobalconsult.com/login" 
              style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; 
              font-weight: bold; border-radius: 5px; display: inline-block;">
              🚀 Explore VIP Jobs Now
            </a>
          </div>

          <p style="margin-top: 30px;">Thank you for trusting us to connect you with meaningful global opportunities.</p>

          <p>Make the most of your new status — update your profile, set alerts, and start applying!</p>

          <p>Warm regards,</p>
          <p><b>The Renewed Minds Global Consult Team</b></p>
        </div>

        <div style="background: #FFA500; color: #fff; text-align: center; padding: 10px; font-size: 12px; 
        border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;">
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

    console.log(`✅ VIP Activation Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send VIP Activation Email to ${email}:`, error);
  }
};
