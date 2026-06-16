import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import createError from "../utils/createError.js";
import User from "../models/userModel.js";
import crypto from "crypto";
import { getExchangeRate } from "../utils/getExchangeRate.js";
import { savePendingUserToSheet } from "../utils/pendingUserSheet.js";

dotenv.config();

const OTP_EXPIRATION_TIME = 2 * 60 * 1000; // 2 minutes
const ADMIN_DOMAIN = "@renewedmindsglobalconsult.com";
const pendingUsers = new Map(); // Temporary storage for unverified users

const BASE_AMOUNT_NGN = 5000;
const VAT_PERCENT = 7.5;
const TOTAL_AMOUNT_NGN = BASE_AMOUNT_NGN * (1 + VAT_PERCENT / 100);
const SUPPORTED_CURRENCIES = ["NGN", "USD", "EUR"];

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // MUST be Google App Password
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email server ready");
  }
});

// Generate OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Hash OTP
const hashOTP = (otp) => bcrypt.hashSync(otp, 5);

// Send OTP Email (No-Reply & Prevent Grouping)
const sendOtpEmail = async (email, username, otp) => {
  console.log(`📧 Sending OTP to ${email}...`);
  try {
    await transporter.sendMail({
      from: `"Renewed Minds Global Consult" <no-reply@renewedmindsglobalconsult.com>`,
      to: email,
      subject: "Your Renewed Minds OTP Code",
      headers: {
        "Message-ID": `<${Date.now()}@renewedmindsglobalconsult.com>`,
        "In-Reply-To": null,
        References: null,
      },
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#FF6B00 0%,#FF9500 100%);padding:40px 48px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;margin-bottom:20px;">
                    <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Security Verification</span>
                  </div>
                  <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;line-height:1.2;">Verify your account</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">One-time password for ${username}</p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:56px;text-align:center;">🔐</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px;">
            <p style="margin:0 0 8px;color:#666;font-size:14px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Your one-time password</p>

            <!-- OTP Box -->
            <div style="background:#fafafa;border:2px solid #FF6B00;border-radius:14px;padding:28px;text-align:center;margin:16px 0 32px;">
              <div style="letter-spacing:12px;font-size:42px;font-weight:900;color:#111;font-variant-numeric:tabular-nums;padding-left:12px;">${otp}</div>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#fff8f0;border-left:4px solid #FF6B00;border-radius:0 8px 8px 0;padding:16px 20px;">
                  <p style="margin:0;color:#333;font-size:14px;line-height:1.6;">
                    ⏱ This OTP expires in <strong>2 minutes</strong>.<br>
                    🔒 Never share this code with anyone — our team will never ask for it.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#888;font-size:13px;line-height:1.7;">
              If you didn't create an account with Renewed Minds Global Consult, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:28px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#111;font-size:13px;font-weight:700;">Renewed Minds Global Consult</p>
                  <p style="margin:0;color:#aaa;font-size:12px;">© ${new Date().getFullYear()} All rights reserved.</p>
                </td>
                <td align="right">
                  <a href="mailto:support@renewedmindsglobalconsult.com" style="color:#FF6B00;font-size:12px;text-decoration:none;font-weight:600;">Need help?</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`✅ OTP sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error);
  }
};

const sendResetPasswordEmail = async (email, username, resetLink) => {
  console.log(`📧 Sending password reset link to ${email}...`);
  try {
    await transporter.sendMail({
      from: `"Renewed Minds Global Consult" <no-reply@renewedmindsglobalconsult.com>`,
      to: email,
      subject: "Reset Your Password — Renewed Minds",
      headers: {
        "Message-ID": `<${Date.now()}@renewedmindsglobalconsult.com>`,
        "In-Reply-To": null,
        References: null,
      },
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:40px 48px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;background:rgba(255,107,0,0.2);border:1px solid rgba(255,107,0,0.4);border-radius:10px;padding:8px 16px;margin-bottom:20px;">
                    <span style="color:#FF6B00;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Account Security</span>
                  </div>
                  <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;line-height:1.2;">Reset your password</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:15px;">We received a request for ${username}</p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <div style="width:56px;height:56px;background:rgba(255,107,0,0.15);border:1px solid rgba(255,107,0,0.3);border-radius:14px;font-size:28px;line-height:56px;text-align:center;">🔑</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px;">
            <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.7;">
              Hi <strong>${username}</strong>, someone requested a password reset for your Renewed Minds account. Click the button below to choose a new password.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#FF6B00,#FF9500);border-radius:12px;">
                  <a href="${resetLink}" style="display:inline-block;padding:16px 40px;color:#fff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:0.3px;">
                    Reset my password →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Fallback link -->
            <div style="background:#fafafa;border-radius:10px;padding:16px 20px;margin-bottom:32px;word-break:break-all;">
              <p style="margin:0 0 6px;color:#999;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Or copy this link</p>
              <a href="${resetLink}" style="color:#FF6B00;font-size:13px;text-decoration:none;">${resetLink}</a>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#fff8f0;border-left:4px solid #FF6B00;border-radius:0 8px 8px 0;padding:16px 20px;">
                  <p style="margin:0;color:#333;font-size:14px;line-height:1.6;">
                    ⏱ This link expires in <strong>1 hour</strong>.<br>
                    🚫 If you didn't request this, please ignore — your password won't change.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:28px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#111;font-size:13px;font-weight:700;">Renewed Minds Global Consult</p>
                  <p style="margin:0;color:#aaa;font-size:12px;">© ${new Date().getFullYear()} All rights reserved.</p>
                </td>
                <td align="right">
                  <a href="mailto:support@renewedmindsglobalconsult.com" style="color:#FF6B00;font-size:12px;text-decoration:none;font-weight:600;">Need help?</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`✅ Password reset email sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${email}:`, error);
  }
};

// Send Welcome Email (Professional UI)
const sendWelcomeEmail = async (email, username, isSeller, isAdmin, role, tier) => {
  console.log(`📧 Sending Welcome Email to ${email}...`);
  try {
    let subject;
    let headerLabel;
    let headerEmoji;
    let headerBg;
    let headline;
    let subline;
    let features;
    let ctaText;
    let ctaLink = "https://www.renewedmindsglobalconsult.com/login";
    let note = null;

    console.log("🧩 Welcome Email Context →", { email, username, isSeller, isAdmin, role, tier });

    if (role === "organization") {
      subject = "Welcome to Renewed Minds Global Consult – Organization Account Created!";
      headerLabel = "Organization Account";
      headerEmoji = "🏢";
      headerBg = "linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%)";
      headline = "Your organization is live";
      subline = "Start connecting with verified remote professionals";
      features = [
        ["📝", "Post remote job opportunities to a verified talent pool"],
        ["💼", "Connect with skilled professionals across Africa and beyond"],
        ["💳", "Manage applications and hire talent securely"],
      ];
      ctaText = "Access Organization Dashboard →";
      note = "Complete your organization verification to activate job posting privileges.";

    } else if (role === "remote_worker" && tier === "vip") {
      subject = "Welcome to Renewed Minds – VIP Remote Worker Activated!";
      headerLabel = "VIP Member";
      headerEmoji = "🌟";
      headerBg = "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)";
      headline = "VIP access unlocked";
      subline = `Welcome aboard, ${username}. Your full access is ready.`;
      features = [
        ["💰", "All remote job listings — no pay range restrictions"],
        ["📬", "Direct applications and priority matching"],
        ["🚀", "Boosted visibility so recruiters find you first"],
      ];
      ctaText = "Open VIP Dashboard →";

    } else if (role === "remote_worker") {
      subject = "Welcome to Renewed Minds – Remote Worker Account Created!";
      headerLabel = "Remote Worker";
      headerEmoji = "💼";
      headerBg = "linear-gradient(135deg,#0369a1 0%,#0ea5e9 100%)";
      headline = "Your remote career starts here";
      subline = `Good to have you, ${username}`;
      features = [
        ["🪙", "Access remote jobs in the $1–$200 pay range"],
        ["📈", "Build a profile that stands out to global clients"],
        ["🎯", "Upgrade to VIP anytime for unlimited job access"],
      ];
      ctaText = "Go to Dashboard →";

    } else if (isAdmin) {
      subject = "Welcome to Renewed Minds – Admin Access Granted!";
      headerLabel = "Administrator";
      headerEmoji = "👑";
      headerBg = "linear-gradient(135deg,#1a1a1a 0%,#374151 100%)";
      headline = "Admin access granted";
      subline = "You have full oversight of the platform";
      features = [
        ["🛠", "Manage users, sellers, and service providers"],
        ["📊", "Monitor platform analytics and transactions"],
        ["💬", "Facilitate communication and resolve disputes"],
      ];
      ctaText = "Access Admin Dashboard →";

    } else if (isSeller) {
      subject = "Welcome to Renewed Minds Global Consult – You're Now a Service Provider!";
      headerLabel = "Service Provider";
      headerEmoji = "🚀";
      headerBg = "linear-gradient(135deg,#FF6B00 0%,#FF9500 100%)";
      headline = `Welcome, ${username}!`;
      subline = "Your freelancer profile is ready to go live";
      features = [
        ["💼", "Create and showcase your services to thousands of clients"],
        ["📈", "Get discovered by businesses looking for your exact skills"],
        ["💰", "Earn, grow, and build your freelance business"],
      ];
      ctaText = "Go to Your Dashboard →";

    } else {
      subject = "Welcome to Renewed Minds Global Consult!";
      headerLabel = "New Member";
      headerEmoji = "🎉";
      headerBg = "linear-gradient(135deg,#FF6B00 0%,#FF9500 100%)";
      headline = `Great to have you, ${username}!`;
      subline = "Your account is ready";
      features = [
        ["✅", "High-quality consulting and professional guidance"],
        ["✅", "A supportive and engaging community"],
        ["✅", "Exclusive resources and expert insights"],
      ];
      ctaText = "Login to Your Account →";
    }

    const featureRows = features.map(([emoji, text]) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f5f5f5;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:40px;vertical-align:middle;">
                <div style="width:36px;height:36px;background:#fff8f0;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">${emoji}</div>
              </td>
              <td style="padding-left:14px;vertical-align:middle;">
                <p style="margin:0;color:#333;font-size:14px;line-height:1.5;">${text}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${headerBg};padding:40px 48px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;margin-bottom:20px;">
                    <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${headerLabel}</span>
                  </div>
                  <h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:800;line-height:1.2;">${headline}</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:15px;">${subline}</p>
                </td>
                <td align="right" style="vertical-align:top;">
                  <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;font-size:28px;line-height:56px;text-align:center;">${headerEmoji}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px;">

            <p style="margin:0 0 8px;color:#999;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">What you get</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
              ${featureRows}
            </table>

            ${note ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#fff8f0;border-left:4px solid #FF6B00;border-radius:0 8px 8px 0;padding:16px 20px;">
                  <p style="margin:0;color:#333;font-size:14px;line-height:1.6;">📌 ${note}</p>
                </td>
              </tr>
            </table>` : ""}

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#FF6B00,#FF9500);border-radius:12px;">
                  <a href="${ctaLink}" style="display:inline-block;padding:16px 40px;color:#fff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:0.3px;">
                    ${ctaText}
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 48px;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>

        <!-- Support strip -->
        <tr>
          <td style="padding:24px 48px;">
            <p style="margin:0;color:#888;font-size:13px;line-height:1.7;text-align:center;">
              Questions? Reach us at
              <a href="mailto:support@renewedmindsglobalconsult.com" style="color:#FF6B00;text-decoration:none;font-weight:600;">support@renewedmindsglobalconsult.com</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:28px 48px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#111;font-size:13px;font-weight:700;">Renewed Minds Global Consult</p>
                  <p style="margin:0;color:#aaa;font-size:12px;">© ${new Date().getFullYear()} All rights reserved.</p>
                </td>
                <td align="right">
                  <p style="margin:0;color:#aaa;font-size:12px;">We can't wait to see you thrive 🌟</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Renewed Minds Global Consult" <no-reply@renewedmindsglobalconsult.com>`,
      to: email,
      subject,
      html,
    });

    console.log(`✅ Welcome Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send Welcome Email to ${email}:`, error);
  }
};

// Register User (Save only in Memory)

// --- Inside register controller, add new role logic ---
export const register = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      isSeller,
      img,
      phone,
      desc,
      country,
      portfolioLink = [],
      languages = [],
      fullName,
      dob,
      address,
      yearsOfExperience,
      stateOfResidence,
      countryOfResidence,
      nextOfKin,
      services = [],
      role,
      tier,
      portfolio,

      // Organization fields
      organizationName,
      organizationWebsite,
      organizationDescription,
      organizationRegNumber,
      organizationContactEmail,
      organizationContactPhone,
      organizationLogo,
      organizationState,
      organizationCountry,
      organizationIndustry,
      organizationCompanySize,
      organizationSocialLinks = {},
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return next(createError(400, "Email already in use"));

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    pendingUsers.set(email, {
      username: username?.trim(),
      email,
      password: await bcrypt.hash(password, 10),
      isSeller,
      img,
      phone,
      desc,
      country,
      portfolioLink,
      languages,
      fullName,
      dob,
      address,
      yearsOfExperience,
      stateOfResidence,
      countryOfResidence,
      services,
      portfolio: portfolio || null,
      nextOfKin: {
        fullName: nextOfKin?.fullName || "",
        dob: nextOfKin?.dob || null,
        stateOfResidence: nextOfKin?.stateOfResidence || "",
        countryOfResidence: nextOfKin?.countryOfResidence || "",
        email: nextOfKin?.email || "",
        address: nextOfKin?.address || "",
        phone: nextOfKin?.phone || "",
      },
      role:
        role === "organization"
          ? "organization"
          : role === "remote_worker"
          ? "remote_worker"
          : null,
      tier:
        role === "remote_worker" && tier?.toLowerCase() === "vip"
          ? "vip"
          : "free",
      organization:
        role === "organization"
          ? {
              name: organizationName || "",
              regNumber: organizationRegNumber || "",
              website: organizationWebsite || "",
              description: organizationDescription || "",
              verified: false,
              contactEmail: organizationContactEmail || email,
              contactPhone: organizationContactPhone || "",
              logo: organizationLogo || "",
              address: address || "",
              state: organizationState || "",
              country: organizationCountry || "",
              industry: organizationIndustry || "",
              companySize: organizationCompanySize || "",
              socialLinks: {
                linkedin: organizationSocialLinks?.linkedin || "",
                twitter: organizationSocialLinks?.twitter || "",
                facebook: organizationSocialLinks?.facebook || "",
              },
            }
          : null,
      hashedOtp,
      otpExpires: Date.now() + OTP_EXPIRATION_TIME,
    });

    await savePendingUserToSheet(pendingUsers.get(email));
    await sendOtpEmail(email, username, otp);

    res.status(201).json({
      message: "OTP sent. Please verify.",
      email,
    });
  } catch (err) {
    next(err);
  }
};

export const flutterwaveFreelancerIntent = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json("Email is required");
    }

    const txRef = `freelancer_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: txRef,
        amount: 5200,
        currency: "NGN",
        redirect_url: `http://localhost:3000/payment/freelancers/success?tx_ref=${txRef}&email=${email}`,
        customer: { email },
        customizations: {
          title: "Freelancer Registration",
          description: "One-time registration fee",
        },
        meta: {
          email,
          role: "freelancer",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paymentLink = response?.data?.data?.link;

    if (!paymentLink) {
      return res.status(500).json("Failed to generate payment link");
    }

    return res.status(200).json({ paymentLink });
  } catch (err) {
    console.error("Flutterwave intent error:", err?.response?.data || err.message);
    return res.status(500).json("Error creating Flutterwave payment intent");
  }
};


export const freelancerPaymentSuccess = async (req, res, next) => {
  const { email, txRef, flwRef, amount, currency } = req.body;

  if (!pendingUsers.has(email))
    return next(createError(404, "No pending registration found"));

  const userData = pendingUsers.get(email);

  // Store payment info in vipSubscription
  userData.vipSubscription = {
    startDate: new Date(),
    endDate: null,
    active: true,
    paymentReference: txRef,
    transactionId: flwRef,
    gateway: "flutterwave",
    amount,
    currency,
    lastCharge: {
      amount,
      currency,
      status: "successful",
      chargedAt: new Date(),
      processorResponse: "Payment successful",
    },
  };

  pendingUsers.set(email, userData);

  res.status(200).json({ message: "Payment recorded successfully" });
};

// --- verifyOtp controller ---
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!pendingUsers.has(email)) {
      return next(createError(404, "No pending registration found"));
    }

    const userData = pendingUsers.get(email);

    if (Date.now() > userData.otpExpires) {
      pendingUsers.delete(email);
      return next(createError(400, "OTP expired. Please register again"));
    }

    const isMatch = await bcrypt.compare(otp, userData.hashedOtp);

    if (!isMatch) {
      return next(createError(400, "Invalid OTP"));
    }

    const newUser = new User({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      isSeller: userData.isSeller,
      img: userData.img,
      phone: userData.phone,
      desc: userData.desc,
      country: userData.country,
      portfolioLink: userData.portfolioLink,
      languages: userData.languages,
      isVerified: true,
      fullName: userData.fullName,
      dob: userData.dob,
      address: userData.address,
      yearsOfExperience: userData.yearsOfExperience,
      stateOfResidence: userData.stateOfResidence,
      countryOfResidence: userData.countryOfResidence,
      services: userData.services,
      nextOfKin: userData.nextOfKin,
      role: userData.role,
      tier: userData.role === "remote_worker" ? userData.tier : null,
      organization:
        userData.role === "organization" ? userData.organization : null,
      portfolio: userData.portfolio || null,
    });

    await newUser.save();
    pendingUsers.delete(email);

    await sendWelcomeEmail(
      email,
      userData.username,
      userData.isSeller,
      userData.isAdmin,
      userData.role,
      userData.tier
    );

    res.status(200).json({
      message: "OTP verified. Account created successfully.",
      role: newUser.role,
      tier: newUser.role === "remote_worker" ? newUser.tier : null,
    });
  } catch (err) {
    console.error("❌ verifyOtp error:", err);
    next(err);
  }
};

// ✅ Login



// Escape regex special characters (security best practice)
const escapeRegex = (text) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const login = async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body;

    // -----------------------------------
    // Determine which login field was sent
    // -----------------------------------
    const loginValue = identifier || email || username;

    if (!loginValue || !password) {
      return res.status(400).json({
        error: "Email/Username and password are required",
      });
    }

    const cleanValue = loginValue.trim();

    // -----------------------------------
    // Build query safely
    // -----------------------------------
    const user = await User.findOne({
      $or: [
        { email: cleanValue.toLowerCase() },
        {
          username: {
            $regex: `^${escapeRegex(cleanValue)}$`,
            $options: "i",
          },
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // -----------------------------------
    // Compare password
    // -----------------------------------
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    // -----------------------------------
    // Determine role
    // -----------------------------------
    let role = "user";

    if (user.isAdmin) role = "admin";
    else if (user.isSeller) role = "seller";
    else if (user.role === "organization" || user.organization?.regNumber)
      role = "organization";
    else if (user.role === "remote_worker")
      role = "remote_worker";

    // -----------------------------------
    // Create JWT
    // -----------------------------------
    const token = jwt.sign(
      {
        id: user._id,
        role,
        isSeller: user.isSeller,
        isAdmin: user.isAdmin,
        isOrganization: role === "organization",
        isRemoteWorker: role === "remote_worker",
      },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    // -----------------------------------
    // Set secure cookie
    // -----------------------------------
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    // -----------------------------------
    // Send response
    // -----------------------------------
    return res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      img: user.img || null,
      bio: user.bio || "",
      country: user.country || "",
      portfolioLink: user.portfolioLink || [],
      role,
      isSeller: user.isSeller,
      isAdmin: user.isAdmin,
      vipSubscription: {
        active: user.vipSubscription?.active ?? false,
        gateway: user.vipSubscription?.gateway ?? null,
      },
      organization: user.organization || null,
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// Resend OTP
export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email)
      return next(createError(400, "Email is required"));

    if (!pendingUsers.has(email)) {
      return next(createError(404, "No pending registration found"));
    }

    const userData = pendingUsers.get(email);

    const otp = generateOTP();

    userData.hashedOtp = await bcrypt.hash(otp, 10);
    userData.otpExpires = Date.now() + OTP_EXPIRATION_TIME;

    pendingUsers.set(email, userData);

    await sendOtpEmail(email, userData.username, otp);

    res.status(200).json({ message: "New OTP sent successfully" });
  } catch (err) {
    console.error("❌ resendOtp error:", err);
    next(err);
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token and expiration (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Generate password reset link
    const resetLink = `https://www.renewedmindsglobalconsult.com/reset-password/${resetToken}`;

    // Send reset email
    await sendResetPasswordEmail(user.email, user.username, resetLink);

    res.json({ message: "Password reset link sent to your email." });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // Hash the reset token sent from the client
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Check if token is not expired
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Hash new password and save it
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Reset user password and clear the reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password has been successfully reset" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Logout
export const logout = async (req, res) => {
  res.clearCookie("accessToken", {
    sameSite: "None",
    secure: true,
  });
  res.status(200).send("Logged out successfully.");
};