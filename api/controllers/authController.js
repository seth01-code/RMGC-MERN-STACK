import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { Resend } from "resend";
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

/* ════════════════════════════════════════════════════════════════════════
   EMAIL TRANSPORT LAYER
   Resend is the primary sender (fast, good deliverability, simple API).
   If the Resend API call throws OR returns an error payload, we
   automatically fall back to Nodemailer over SMTP so emails still go out.
   ════════════════════════════════════════════════════════════════════════ */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // MUST be Google App Password (or SMTP creds)
  },
});

smtpTransporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP fallback transporter error:", error.message);
    console.error("❌ Email config:", {
      user: process.env.EMAIL_USER ? "SET" : "MISSING",
      pass: process.env.EMAIL_PASS ? "SET" : "MISSING",
    });
  } else {
    console.log("✅ SMTP fallback transporter ready");
  }
});

if (!resend) {
  console.warn(
    "⚠️  RESEND_API_KEY not set — all emails will go straight to the SMTP fallback.",
  );
}

/**
 * Unified email sender.
 * Tries Resend first. If Resend throws, or returns an `error` in its
 * response payload, falls back to Nodemailer/SMTP automatically.
 *
 * @param {Object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.from]              defaults to BRAND.from
 * @param {Object} [opts.headers]           extra headers (used by SMTP path)
 * @param {string} [opts.replyTo]
 */
const sendEmail = async ({ to, subject, html, from, headers, replyTo }) => {
  const fromAddress = from || BRAND.from;

  // ─── 1. Try Resend ───────────────────────────────────────────────
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(headers ? { headers } : {}),
      });

      if (error) {
        throw new Error(
          typeof error === "string" ? error : JSON.stringify(error),
        );
      }

      console.log(`✅ [Resend] Email sent to ${to} (id: ${data?.id})`);
      return { provider: "resend", success: true, id: data?.id };
    } catch (resendErr) {
      console.error(
        `⚠️  [Resend] Failed to send to ${to}, falling back to SMTP:`,
        resendErr?.message || resendErr,
      );
      // fall through to SMTP
    }
  }

  // ─── 2. Fallback: Nodemailer / SMTP ─────────────────────────────
  try {
    const info = await smtpTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(headers ? { headers } : {}),
    });

    console.log(`✅ [SMTP] Email sent to ${to} (messageId: ${info.messageId})`);
    return { provider: "smtp", success: true, id: info.messageId };
  } catch (smtpErr) {
    console.error(`❌ [SMTP] Failed to send to ${to}:`, smtpErr?.message || smtpErr);
    return { provider: "smtp", success: false, error: smtpErr?.message || String(smtpErr) };
  }
};

// Generate OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ════════════════════════════════════════════════════════════════════════
   EMAIL DESIGN SYSTEM
   Orange + white only. Forced light-mode rendering via meta tags + literal
   bgcolor attributes (more reliable than prefers-color-scheme overrides
   for guaranteeing the same look on every device/theme). No icons/emoji.
   ════════════════════════════════════════════════════════════════════════ */

const BRAND = {
  name: "Renewed Minds Global Consult",
  supportEmail: "support@renewedmindsglobalconsult.com",
  from: '"Renewed Minds Global Consult" <no-reply@renewedmindsglobalconsult.com>',
  orange: "#FF6B00",
  orangeSoft: "#FF9500",
};

const PALETTE = {
  pageBg: "#fff7f0", // soft warm white — the outer page
  cardBg: "#ffffff", // pure white — the card itself
  border: "#f3e6da", // hairline divider, warm-tinted
  heading: "#171717", // near-black, for headings only
  body: "#4a4a4a", // dark gray body copy (legibility — see note above)
  muted: "#9a9a9a", // light gray for labels/timestamps
  surface: "#fff3e8", // light orange tint — replaces old gray surfaces
  glow: "rgba(255,107,0,0.18)",
};

// Forces every client to render this as a fixed light-mode email regardless
// of the device's system theme. `color-scheme: light only` tells compliant
// clients (Apple Mail, new Outlook apps, etc.) not to auto-invert it. Every
// background below is ALSO set via the literal `bgcolor` HTML attribute (in
// addition to CSS) as a fallback for clients that strip <style> tags or
// ignore the meta directive — they'll still see real white/orange, not a
// half-inverted mismatch.
const renderHeader = ({ eyebrow, title, subtitle }) => `
  <tr>
    <td bgcolor="${PALETTE.cardBg}" style="background-color:${PALETTE.cardBg};background-image:radial-gradient(ellipse 520px 220px at 50% -70px, ${PALETTE.glow}, rgba(255,255,255,0) 70%);padding:44px 48px 32px;">
      <div style="width:28px;height:3px;background-color:${BRAND.orange};border-radius:2px;margin-bottom:14px;"></div>
      <span style="display:block;color:${BRAND.orange};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">${eyebrow}</span>
      <h1 style="margin:0;color:${PALETTE.heading};font-size:26px;font-weight:800;line-height:1.3;">${title}</h1>
      <p style="margin:8px 0 0;color:${PALETTE.muted};font-size:15px;">${subtitle}</p>
    </td>
  </tr>
`;

const renderCallout = (html) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr>
      <td bgcolor="${PALETTE.surface}" style="background-color:${PALETTE.surface};border-left:4px solid ${BRAND.orange};border-radius:0 8px 8px 0;padding:16px 20px;">
        <p style="margin:0;color:${PALETTE.body};font-size:14px;line-height:1.6;">${html}</p>
      </td>
    </tr>
  </table>
`;

const renderCtaButton = (href, label) => `
  <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
    <tr>
      <td bgcolor="${BRAND.orange}" align="center" style="background-color:${BRAND.orange};background-image:linear-gradient(135deg,${BRAND.orange},${BRAND.orangeSoft});border-radius:12px;">
        <a href="${href}" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:0.3px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

const renderFooter = () => `
  <tr>
    <td bgcolor="${PALETTE.cardBg}" style="background-color:${PALETTE.cardBg};border-top:1px solid ${PALETTE.border};padding:24px 48px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0 0 4px;color:${PALETTE.heading};font-size:13px;font-weight:700;">${BRAND.name}</p>
            <p style="margin:0;color:${PALETTE.muted};font-size:12px;">© ${new Date().getFullYear()} All rights reserved.</p>
          </td>
          <td align="right">
            <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.orange};font-size:12px;text-decoration:none;font-weight:600;">Need help?</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
`;

const renderShell = (bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <style>body{margin:0;padding:0;}</style>
</head>
<body bgcolor="${PALETTE.pageBg}" style="margin:0;padding:0;background-color:${PALETTE.pageBg};font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${PALETTE.pageBg}" style="background-color:${PALETTE.pageBg};padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" bgcolor="${PALETTE.cardBg}" style="max-width:600px;width:100%;background-color:${PALETTE.cardBg};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        ${bodyHtml}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const noReplyHeaders = () => ({
  "Message-ID": `<${Date.now()}@renewedmindsglobalconsult.com>`,
});

/* ─── 1. OTP EMAIL ─────────────────────────────────────────────────────── */

const sendOtpEmail = async (email, username, otp) => {
  console.log(`📧 Sending OTP to ${email}...`);

  const body = `
    ${renderHeader({
      eyebrow: "Security verification",
      title: "Verify your account",
      subtitle: `One-time password for ${username}`,
    })}
    <tr>
      <td style="padding:8px 48px 44px;">
        <p style="margin:0 0 10px;color:${PALETTE.muted};font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">
          Your one-time password
        </p>

        <div style="background-color:${PALETTE.surface};border:2px solid ${BRAND.orange};border-radius:14px;padding:28px;text-align:center;margin:8px 0 32px;">
          <div style="letter-spacing:12px;font-size:42px;font-weight:900;color:${PALETTE.heading};font-variant-numeric:tabular-nums;padding-left:12px;">
            ${otp}
          </div>
        </div>

        ${renderCallout(`This OTP expires in <strong>2 minutes</strong>.<br>Never share this code with anyone — our team will never ask for it.`)}

        <p style="margin:0;color:${PALETTE.muted};font-size:13px;line-height:1.7;">
          If you didn't create an account with ${BRAND.name}, you can safely ignore this email.
        </p>
      </td>
    </tr>
    ${renderFooter()}
  `;

  const result = await sendEmail({
    to: email,
    subject: "Your Renewed Minds OTP Code",
    html: renderShell(body),
    headers: noReplyHeaders(),
  });

  if (result.success) {
    console.log(`✅ OTP sent successfully to ${email} via ${result.provider}`);
  } else {
    console.error(`❌ Failed to send OTP to ${email} on all providers`);
  }

  return result;
};

/* ─── 2. RESET PASSWORD EMAIL ──────────────────────────────────────────── */

const sendResetPasswordEmail = async (email, username, resetLink) => {
  console.log(`📧 Sending password reset link to ${email}...`);

  const body = `
    ${renderHeader({
      eyebrow: "Account security",
      title: "Reset your password",
      subtitle: `We received a request for ${username}`,
    })}
    <tr>
      <td style="padding:8px 48px 44px;">
        <p style="margin:0 0 24px;color:${PALETTE.body};font-size:15px;line-height:1.7;">
          Hi <strong>${username}</strong>, someone requested a password reset for your ${BRAND.name} account. Click the button below to choose a new password.
        </p>

        ${renderCtaButton(resetLink, "Reset my password →")}

        <div style="margin-top:24px;background-color:${PALETTE.surface};border-radius:10px;padding:16px 20px;margin-bottom:32px;word-break:break-all;">
          <p style="margin:0 0 6px;color:${PALETTE.muted};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
            Or copy this link
          </p>
          <a href="${resetLink}" style="color:${BRAND.orange};font-size:13px;text-decoration:none;">${resetLink}</a>
        </div>

        ${renderCallout(`This link expires in <strong>1 hour</strong>.<br>If you didn't request this, please ignore — your password won't change.`)}
      </td>
    </tr>
    ${renderFooter()}
  `;

  const result = await sendEmail({
    to: email,
    subject: "Reset Your Password — Renewed Minds",
    html: renderShell(body),
    headers: noReplyHeaders(),
  });

  if (result.success) {
    console.log(
      `✅ Password reset email sent successfully to ${email} via ${result.provider}`,
    );
  } else {
    console.error(`❌ Failed to send password reset email to ${email} on all providers`);
  }

  return result;
};

/* ─── 3. WELCOME EMAIL ─────────────────────────────────────────────────── */

const sendWelcomeEmail = async (
  email,
  username,
  isSeller,
  isAdmin,
  role,
  tier,
) => {
  console.log(`📧 Sending Welcome Email to ${email}...`);

  let subject, eyebrow, headline, subline, features;
  const ctaLink = "https://www.renewedmindsglobalconsult.com/login";
  let ctaText = "Login to your account →";
  let note = null;

  console.log("🧩 Welcome Email Context →", {
    email,
    username,
    isSeller,
    isAdmin,
    role,
    tier,
  });

  if (role === "organization") {
    subject =
      "Welcome to Renewed Minds Global Consult – Organization Account Created!";
    eyebrow = "Organization account";
    headline = "Your organization is live";
    subline = "Start connecting with verified remote professionals";
    features = [
      "Post remote job opportunities to a verified talent pool",
      "Connect with skilled professionals across Africa and beyond",
      "Manage applications and hire talent securely",
    ];
    ctaText = "Access organization dashboard →";
    note =
      "Complete your organization verification to activate job posting privileges.";
  } else if (role === "remote_worker" && tier === "vip") {
    subject = "Welcome to Renewed Minds – VIP Remote Worker Activated!";
    eyebrow = "VIP member";
    headline = "VIP access unlocked";
    subline = `Welcome aboard, ${username}. Your full access is ready.`;
    features = [
      "All remote job listings — no pay range restrictions",
      "Direct applications and priority matching",
      "Boosted visibility so recruiters find you first",
    ];
    ctaText = "Open VIP dashboard →";
  } else if (role === "remote_worker") {
    subject = "Welcome to Renewed Minds – Remote Worker Account Created!";
    eyebrow = "Remote worker";
    headline = "Your remote career starts here";
    subline = `Good to have you, ${username}`;
    features = [
      "Access remote jobs in the $1–$200 pay range",
      "Build a profile that stands out to global clients",
      "Upgrade to VIP anytime for unlimited job access",
    ];
    ctaText = "Go to dashboard →";
  } else if (isAdmin) {
    subject = "Welcome to Renewed Minds – Admin Access Granted!";
    eyebrow = "Administrator";
    headline = "Admin access granted";
    subline = "You have full oversight of the platform";
    features = [
      "Manage users, sellers, and service providers",
      "Monitor platform analytics and transactions",
      "Facilitate communication and resolve disputes",
    ];
    ctaText = "Access admin dashboard →";
  } else if (isSeller) {
    subject =
      "Welcome to Renewed Minds Global Consult – You're Now a Service Provider!";
    eyebrow = "Service provider";
    headline = `Welcome, ${username}!`;
    subline = "Your freelancer profile is ready to go live";
    features = [
      "Create and showcase your services to thousands of clients",
      "Get discovered by businesses looking for your exact skills",
      "Earn, grow, and build your freelance business",
    ];
    ctaText = "Go to your dashboard →";
  } else {
    subject = "Welcome to Renewed Minds Global Consult!";
    eyebrow = "New member";
    headline = `Great to have you, ${username}!`;
    subline = "Your account is ready";
    features = [
      "High-quality consulting and professional guidance",
      "A supportive and engaging community",
      "Exclusive resources and expert insights",
    ];
  }

  const featureRows = features
    .map(
      (text) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${PALETTE.border};">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:18px;vertical-align:middle;">
              <div style="width:6px;height:6px;border-radius:50%;background-color:${BRAND.orange};"></div>
            </td>
            <td style="padding-left:14px;vertical-align:middle;">
              <p style="margin:0;color:${PALETTE.body};font-size:14px;line-height:1.5;">${text}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `,
    )
    .join("");

  const body = `
    ${renderHeader({ eyebrow, title: headline, subtitle: subline })}
    <tr>
      <td style="padding:8px 48px;">
        <p style="margin:0 0 6px;color:${PALETTE.muted};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
          What you get
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          ${featureRows}
        </table>

        ${note ? renderCallout(note) : ""}

        ${renderCtaButton(ctaLink, ctaText)}
      </td>
    </tr>

    <tr><td style="padding:8px 48px 0;"><div style="height:1px;background-color:${PALETTE.border};"></div></td></tr>

    <tr>
      <td style="padding:24px 48px;">
        <p style="margin:0;color:${PALETTE.muted};font-size:13px;line-height:1.7;text-align:center;">
          Questions? Reach us at
          <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.orange};text-decoration:none;font-weight:600;">${BRAND.supportEmail}</a>
        </p>
      </td>
    </tr>

    ${renderFooter()}
  `;

  const result = await sendEmail({
    to: email,
    subject,
    html: renderShell(body),
  });

  if (result.success) {
    console.log(`✅ Welcome Email sent successfully to ${email} via ${result.provider}`);
  } else {
    console.error(`❌ Failed to send Welcome Email to ${email} on all providers`);
  }

  return result;
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
      },
    );

    const paymentLink = response?.data?.data?.link;

    if (!paymentLink) {
      return res.status(500).json("Failed to generate payment link");
    }

    return res.status(200).json({ paymentLink });
  } catch (err) {
    console.error(
      "Flutterwave intent error:",
      err?.response?.data || err.message,
    );
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
      userData.tier,
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


// ── Suspension check ──────────────────────────────────────────
if (user.suspended) {
  return res.status(403).json({
    error: "account_suspended",
    reason: user.suspendReason || "Your account has been suspended. Please contact support.",
  });
}

    // -----------------------------------
    // Determine role
    // -----------------------------------
    let role = "user";

    if (user.isAdmin) role = "admin";
    else if (user.isSeller) role = "seller";
    else if (user.role === "organization" || user.organization?.regNumber)
      role = "organization";
    else if (user.role === "remote_worker") role = "remote_worker";

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
      { expiresIn: "7d" },
    );

    // -----------------------------------
    // Set secure cookie
    // -----------------------------------
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
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

    if (!email) return next(createError(400, "Email is required"));

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
  res.status(200).json({ redirectUrl: "http://localhost:3000/login" });
};