import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import createError from "../utils/createError.js";
import User from "../models/userModel.js";
import crypto from "crypto";

dotenv.config();

const OTP_EXPIRATION_TIME = 10 * 60 * 1000; // 2 minutes
const ADMIN_DOMAIN = "@renewedmindsglobalconsult.com";
const pendingUsers = new Map(); // Temporary storage for unverified users

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
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
const sendWelcomeEmail = async (email, username, isSeller, isAdmin) => {
  console.log(`📧 Sending Welcome Email to ${email}...`);

  try {
    let subject;
    let userMessage;

    if (isAdmin) {
      subject =
        "👑 Welcome to Renewed Minds Global Consult – Admin Access Granted!";
      userMessage = `
        <p>Dear <b>${username}</b>,</p>

        <p>Welcome to <b>Renewed Minds Global Consult</b>! 🎉</p>

        <p>As an <b>Administrator</b>, you have special privileges to oversee platform activities. 🔥</p>

        <p>Here’s what you can do as an Admin:</p>
        
        <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
          <li>🛠 Manage users and service providers</li>
          <li>📊 Monitor platform analytics and transactions</li>
          <li>💬 Facilitate communication and issue resolution</li>
        </ul>

        <p>You can access the admin dashboard using the button below:</p>

        <div style="text-align: center; margin-top: 20px;">
          <a href="https://renewedmindsglobalconsult.com/admin" style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
            🔑 Access Admin Dashboard
          </a>
        </div>
      `;
    } else if (isSeller) {
      subject =
        "🚀 Welcome to Renewed Minds Global Consult – As A Service Provider!";
      userMessage = `
        <p>Dear <b>${username}</b>,</p>

        <p>Welcome to <b>Renewed Minds Global Consult</b>! 🎉</p>

        <p>We’re excited to have you as a <b>service provider</b> on our platform. 🌟</p>

        <p>Here’s what you can do as a Service Provider:</p>
        
        <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px; color: #555;">
          <li>💼 Create & showcase your services</li>
          <li>📈 Get discovered by clients worldwide</li>
          <li>💰 Earn and grow your business</li>
        </ul>

        <p>Start by setting up your profile and publishing your first service!</p>

        <div style="text-align: center; margin-top: 20px;">
          <a href="https://renewedmindsglobalconsult.com/seller" style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
            🚀 Go to Your Dashboard
          </a>
        </div>
      `;
    } else {
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

        <p>Get started now by exploring our platform.</p>

        <div style="text-align: center; margin-top: 20px;">
          <a href="https://renewedmindsglobalconsult.com/login" style="background: #FFA500; color: #fff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
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

          <p style="margin-top: 30px;">If you have any questions, feel free to <a href="mailto:support@renewedmindsglobalconsult.com" style="color: #4CAF50; text-decoration: none; font-weight: bold;">contact our support team</a>.</p>

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
      subject: subject,
      html: emailBody,
    });

    console.log(`✅ Welcome Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send Welcome Email to ${email}:`, error);
  }
};

// Register User (Save only in Memory)
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
      portfolioLink = [], // Default to empty array
      languages = [], // Default to empty array
      fullName,
      dob,
      address,
      yearsOfExperience,
      stateOfResidence,
      countryOfResidence,
      nextOfKin,
      services = [], // Default to empty array
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return next(createError(400, "Email already in use"));

    const isAdmin = email.toLowerCase().trim().endsWith(ADMIN_DOMAIN);

    if (!isAdmin && email.toLowerCase().trim().includes(ADMIN_DOMAIN)) {
      return next(createError(400, "Unauthorized email domain"));
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);
    const otpExpires = Date.now() + OTP_EXPIRATION_TIME;

    pendingUsers.set(email, {
      username,
      email,
      password: bcrypt.hashSync(password, 5),
      isSeller,
      isAdmin,
      img,
      phone,
      desc,
      country,
      portfolioLink: Array.isArray(portfolioLink)
        ? portfolioLink
        : [portfolioLink], // Ensure array
      languages: Array.isArray(languages) ? languages : [languages], // Ensure array
      fullName,
      dob,
      address,
      yearsOfExperience,
      stateOfResidence,
      countryOfResidence,
      services: Array.isArray(services) ? services : [services], // Ensure array
      nextOfKin: {
        fullName: nextOfKin?.fullName || "",
        dob: nextOfKin?.dob || null,
        stateOfResidence: nextOfKin?.stateOfResidence || "",
        countryOfResidence: nextOfKin?.countryOfResidence || "",
        email: nextOfKin?.email || "",
        address: nextOfKin?.address || "",
        phone: nextOfKin?.phone || "",
      },
      hashedOtp,
      otpExpires,
    });

    await sendOtpEmail(email, username, otp);

    res.status(201).json({ message: "OTP sent. Please verify.", email });
  } catch (err) {
    next(err);
  }
};

// Verify OTP & Save User in Database
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!pendingUsers.has(email)) {
      return next(
        createError(404, "No pending registration found for this email")
      );
    }

    const userData = pendingUsers.get(email);

    if (Date.now() > userData.otpExpires) {
      pendingUsers.delete(email);
      return next(createError(400, "OTP expired. Please register again"));
    }

    const isMatch = bcrypt.compareSync(otp, userData.hashedOtp);
    if (!isMatch) return next(createError(400, "Invalid OTP"));

    // Save the user in the database
    const newUser = new User({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      isSeller: userData.isSeller,
      isAdmin: userData.isAdmin,
      img: userData.img,
      phone: userData.phone,
      desc: userData.desc,
      country: userData.country,
      portfolioLink: userData.portfolioLink, // Save array
      languages: userData.languages, // Save array
      isVerified: true,
      fullName: userData.fullName,
      dob: userData.dob,
      address: userData.address,
      yearsOfExperience: userData.yearsOfExperience,
      stateOfResidence: userData.stateOfResidence,
      countryOfResidence: userData.countryOfResidence,
      services: userData.services, // Save array
      nextOfKin: {
        fullName: userData.nextOfKin?.fullName || "",
        dob: userData.nextOfKin?.dob || null,
        stateOfResidence: userData.nextOfKin?.stateOfResidence || "",
        countryOfResidence: userData.nextOfKin?.countryOfResidence || "",
        email: userData.nextOfKin?.email || "",
        address: userData.nextOfKin?.address || "",
        phone: userData.nextOfKin?.phone || "",
      },
    });

    await newUser.save();
    pendingUsers.delete(email);

    // Send Welcome Email with isSeller
    await sendWelcomeEmail(
      email,
      userData.username,
      userData.isSeller,
      userData.isAdmin
    );

    res
      .status(200)
      .json({ message: "OTP verified. Account created successfully." });
  } catch (err) {
    next(err);
  }
};

// Edit OTP verification for user profile updates
// export const verifyEditOtp = async (req, res, next) => {
//   try {
//     const { email, otp } = req.body;

//     // Check if email exists in the database
//     const user = await User.findOne({ email });
//     if (!user) {
//       return next(createError(404, "No user found with this email"));
//     }

//     // If OTP hasn't been sent yet, send a new OTP
//     if (!pendingUsers.has(email)) {
//       const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
//       const hashedOtp = bcrypt.hashSync(otpCode, 10);

//       // Store the OTP and expiration time
//       pendingUsers.set(email, {
//         hashedOtp,
//         otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
//       });

//       // Send OTP to user (you can integrate email sending here)
//       await sendOtpEmail(email, otpCode);

//       return res.status(200).json({ message: "OTP sent successfully" });
//     }

//     // Check if OTP is valid
//     const userData = pendingUsers.get(email);
//     if (Date.now() > userData.otpExpires) {
//       pendingUsers.delete(email);
//       return next(createError(400, "OTP expired. Please request a new OTP"));
//     }

//     const isMatch = bcrypt.compareSync(otp, userData.hashedOtp);
//     if (!isMatch) return next(createError(400, "Invalid OTP"));

//     // If OTP is valid, allow email change or other profile updates
//     return res.status(200).json({ message: "OTP verified. Proceed with updating profile" });

//   } catch (err) {
//     next(err);
//   }
// };

// Resend OTP
// export const resendOtp = async (req, res, next) => {
//   try {
//     const { email } = req.body;
//     if (!email) return next(createError(400, "Email is required"));

//     if (!pendingUsers.has(email)) {
//       return next(
//         createError(404, "No pending registration found for this email")
//       );
//     }

//     const userData = pendingUsers.get(email);
//     if (Date.now() < userData.otpExpires) {
//       return next(createError(400, "Please wait before requesting a new OTP"));
//     }

//     const newOtp = generateOTP();
//     userData.hashedOtp = hashOTP(newOtp);
//     userData.otpExpires = Date.now() + OTP_EXPIRATION_TIME;
//     pendingUsers.set(email, userData);

//     await sendOtpEmail(email, userData.username, newOtp);
//     res
//       .status(200)
//       .json({ message: "New OTP sent. Please check your email.", email });
//   } catch (err) {
//     next(err);
//   }
// };

// ✅ Login
export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    const user = await User.findOne({ $or: [{ email }, { username }] });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
    if (!user.isVerified)
      return res.status(400).json({ error: "Please verify your email first" });

    const token = jwt.sign(
      { id: user._id, isSeller: user.isSeller, isAdmin: user.isAdmin },
      process.env.JWT_KEY,
      { expiresIn: "1d" }
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });

    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      isSeller: user.isSeller,
      isAdmin: user.isAdmin,
      img: user.img || null,
      bio: user.bio || "",
      country: user.country || "",
      portfolioLink: user.portfolioLink || "",
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Resend OTP
export const resendOtp = async (req, res, next) => {
  try {
    console.log("Request Body:", req.body); // Debugging step

    const { email } = req.body;
    const { username } = req.body;
    if (!email) return next(createError(400, "Email is required"));

    if (!pendingUsers.has(email)) {
      return next(
        createError(404, "No pending registration found for this email")
      );
    }

    const userData = pendingUsers.get(email, username);

    // Generate a new OTP
    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);
    const otpExpires = Date.now() + OTP_EXPIRATION_TIME;

    // Update only the OTP-related details
    userData.hashedOtp = hashedOtp;
    userData.otpExpires = otpExpires;

    // Save the updated userData back into pendingUsers
    pendingUsers.set(email, userData);

    // Send OTP via email
    await sendOtpEmail(email, username, otp);

    return res.status(200).json({ message: "New OTP sent successfully" });
  } catch (err) {
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
