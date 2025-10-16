import transporter from "./transporter.js"; // adjust to your mail transporter path

export const sendOrganizationVerificationEmail = async (
  email,
  organizationName
) => {
  console.log(`📧 Sending Organization Verification Email to ${email}...`);

  try {
    const subject =
      "✅ Your Organization Has Been Verified – Start Posting Remote Jobs!";

    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
        <div style="background: #FFA500; color: #fff; padding: 15px; text-align: center; border-top-left-radius: 10px; border-top-right-radius: 10px;">
          <h1>${subject}</h1>
        </div>

        <div style="padding: 20px; color: #333;">
          <p>Dear <b>${organizationName}</b>,</p>

          <p>We’re excited to inform you that your organization has been <b>successfully verified</b> on <b>Renewed Minds Global Consult</b>! 🎉</p>

          <p>You can now:</p>
          <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
            <li>💼 Post verified remote job listings</li>
            <li>🔍 Access qualified remote workers across various skill sets</li>
            <li>📬 Manage applications directly from your dashboard</li>
            <li>💳 Track payments, hires, and communication all in one place</li>
          </ul>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.renewedmindsglobalconsult.com/login" 
              style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; 
              font-weight: bold; border-radius: 5px; display: inline-block;">
              🏢 Access Organization Dashboard
            </a>
          </div>

          <p style="margin-top: 30px;">If you need help getting started with job postings, our support team is ready to assist.</p>

          <p>Welcome to the future of remote recruitment. Let’s grow together! 🌍</p>

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

    console.log(
      `✅ Organization Verification Email sent successfully to ${email}`
    );
  } catch (error) {
    console.error(
      `❌ Failed to send Organization Verification Email to ${email}:`,
      error
    );
  }
};
