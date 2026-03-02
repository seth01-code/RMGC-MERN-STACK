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
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4CAF50;">Verify Your Account</h2>
          <p>Dear <b>${username}</b>,</p>
          <p>Use the One-Time Password (OTP) below to complete your sign-up:</p>
          
          <div style="font-size: 24px; font-weight: bold; color: #333; background: #f4f4f4; padding: 10px; text-align: center; border-radius: 5px;">
            ${otp}
          </div>

          <p>This OTP is valid for <b>2 minutes</b>. Do not share this OTP with anyone.</p>

          <p>Best Regards,<br>
          <b>Renewed Minds Global Consult Team</b></p>
        </div>
      `,
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
      subject: "Reset Your Password",
      headers: {
        "Message-ID": `<${Date.now()}@renewedmindsglobalconsult.com>`,
        "In-Reply-To": null,
        References: null,
      },
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #ff9800;">Reset Your Password</h2>
          <p>Dear <b>${username}</b>,</p>
          <p>We received a request to reset your password. Click the button below to proceed:</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="background: #ff9800; color: #fff; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;">
              Reset Password
            </a>
          </div>

          <p>If you didn’t request a password reset, please ignore this email.</p>

          <p>This link is valid for <b>1 hour</b>.</p>

          <p>Best Regards,<br>
          <b>Renewed Minds Global Consult Team</b></p>
        </div>
      `,
    });

    console.log(`✅ Password reset email sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${email}:`, error);
  }
};

// Send Welcome Email (Professional UI)
const sendWelcomeEmail = async (
  email,
  username,
  isSeller,
  isAdmin,
  role,
  tier
) => {
  console.log(`📧 Sending Welcome Email to ${email}...`);

  try {
    let subject;
    let userMessage;

    console.log("🧩 Welcome Email Context →", {
      email,
      username,
      isSeller,
      isAdmin,
      role,
      tier,
    });

    // ✅ Organization welcome email (check first)
    if (role === "organization") {
      subject =
        "🏢 Welcome to Renewed Minds Global Consult – Organization Account Created!";
      userMessage = `
        <p>Dear <b>${username}</b>,</p>
        <p>Welcome to <b>Renewed Minds Global Consult</b>! 🎉</p>
        <p>Your <b>Organization Account</b> has been successfully created.</p>
        <p>Here’s what you can do as an Organization:</p>
        <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
          <li>📝 Post remote job opportunities</li>
          <li>💼 Connect with verified remote professionals</li>
          <li>💳 Manage applications and hire talent securely</li>
        </ul>
        <p>Note: To activate job posting privileges, please complete your organization verification and payment.</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://www.renewedmindsglobalconsult.com/login"
             style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
            🏢 Access Organization Dashboard
          </a>
        </div>
      `;
    }

    // ✅ Remote Worker welcome email (second)
    else if (role === "remote_worker") {
      const tierText =
        tier === "vip"
          ? "🌟 VIP Remote Worker Subscription Activated!"
          : "💼 Free Tier Remote Worker Account Created!";
      subject = `🌍 Welcome to Renewed Minds Global Consult – ${tierText}`;

      if (tier === "vip") {
        userMessage = `
          <p>Dear <b>${username}</b>,</p>
          <p>Welcome aboard as a <b>VIP Remote Worker</b>! 🌟</p>
          <p>As a VIP member, you now have full access to:</p>
          <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
            <li>💰 All remote job listings, regardless of pay range</li>
            <li>📬 Direct applications and faster matching</li>
            <li>🚀 Priority visibility for recruiters</li>
          </ul>
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.renewedmindsglobalconsult.com/login"
               style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
              🌟 Access Your VIP Dashboard
            </a>
          </div>
        `;
      } else {
        userMessage = `
          <p>Dear <b>${username}</b>,</p>
          <p>Welcome to <b>Renewed Minds Global Consult</b> as a <b>Remote Worker (Free Tier)</b>! 💼</p>
          <p>Here’s what’s available to you right now:</p>
          <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
            <li>🪙 Access remote jobs between $1 – $200</li>
            <li>📈 Build your remote career profile</li>
            <li>🎯 Upgrade to VIP anytime for full job access</li>
          </ul>
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.renewedmindsglobalconsult.com/login"
               style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
              💼 Go to Your Remote Dashboard
            </a>
          </div>
        `;
      }
    }

    // ✅ Admin welcome email
    else if (isAdmin) {
      subject =
        "👑 Welcome to Renewed Minds Global Consult – Admin Access Granted!";
      userMessage = `
        <p>Dear <b>${username}</b>,</p>
        <p>Welcome to <b>Renewed Minds Global Consult</b>! 🎉</p>
        <p>As an <b>Administrator</b>, you have special privileges to oversee platform activities. 🔥</p>
        <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
          <li>🛠 Manage users and service providers</li>
          <li>📊 Monitor platform analytics and transactions</li>
          <li>💬 Facilitate communication and issue resolution</li>
        </ul>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://www.renewedmindsglobalconsult.com/login"
             style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
            🔑 Access Admin Dashboard
          </a>
        </div>
      `;
    }

    // ✅ Seller (freelancer) welcome email
    else if (isSeller) {
      subject =
        "🚀 Welcome to Renewed Minds Global Consult – As A Service Provider!";
      userMessage = `
        <p>Dear <b>${username}</b>,</p>
        <p>Welcome to <b>Renewed Minds Global Consult</b>! 🎉</p>
        <p>We’re excited to have you as a <b>service provider</b> on our platform. 🌟</p>
        <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
          <li>💼 Create & showcase your services</li>
          <li>📈 Get discovered by clients worldwide</li>
          <li>💰 Earn and grow your business</li>
        </ul>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://www.renewedmindsglobalconsult.com/login"
             style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
            🚀 Go to Your Dashboard
          </a>
        </div>
      `;
    }

    // ✅ General user fallback
    else {
      subject = "🎉 Welcome to Renewed Minds Global Consult!";
      userMessage = `
        <p>Dear <b>${username}</b>,</p>
        <p>Welcome to <b>Renewed Minds Global Consult</b>! 🎉</p>
        <p>We’re thrilled to have you join our community. 🚀</p>
        <p>As a valued member, you’ll gain access to:</p>
        <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
          <li>✅ High-quality consulting & professional guidance</li>
          <li>✅ A supportive and engaging community</li>
          <li>✅ Exclusive resources and expert insights</li>
        </ul>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://www.renewedmindsglobalconsult.com/login"
             style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
            🚀 Login to Your Account
          </a>
        </div>
      `;
    }

    const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1);">
        <div style="background: #FFA500; color: #fff; padding: 15px; text-align: center; border-top-left-radius: 10px; border-top-right-radius: 10px;">
          <h1>${subject}</h1>
        </div>

        <div style="padding: 20px; color: #333;">
          ${userMessage}

          <p style="margin-top: 30px;">If you have any questions, feel free to 
            <a href="mailto:support@renewedmindsglobalconsult.com" 
               style="color: #4CAF50; text-decoration: none; font-weight: bold;">
               contact our support team
            </a>.
          </p>

          <p>Once again, welcome! We can’t wait to see you thrive. 🌟</p>

          <p>Best Regards,</p>
          <p><b>The Renewed Minds Global Consult Team</b></p>
        </div>

        <div style="background: #FFA500; color: #fff; text-align: center; padding: 10px; font-size: 12px; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;">
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

    // ✅ NEW: Save to spreadsheet (safe + non-blocking)
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
    const { identifier, password } = req.body;

    // -------------------------
    // Validation
    // -------------------------
    if (!identifier || !password) {
      return res.status(400).json({
        error: "Email/Username and password are required",
      });
    }

    const cleanIdentifier = identifier.trim();

    // -------------------------
    // Build query (email OR username)
    // -------------------------
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        {
          username: {
            $regex: `^${escapeRegex(cleanIdentifier)}$`,
            $options: "i",
          },
        },
      ],
    });

    if (!user) {
      // You may optionally change to 401 for better auth semantics
      return res.status(404).json({ error: "User not found" });
    }

    // -------------------------
    // Compare password
    // -------------------------
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    // -------------------------
    // Determine role
    // -------------------------
    let role = "user";

    if (user.isAdmin) role = "admin";
    else if (user.isSeller) role = "seller";
    else if (user.role === "organization" || user.organization?.regNumber)
      role = "organization";
    else if (user.role === "remote_worker")
      role = "remote_worker";

    // -------------------------
    // Create JWT
    // -------------------------
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

    // -------------------------
    // Set secure cookie
    // -------------------------
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    // -------------------------
    // Send response
    // -------------------------
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