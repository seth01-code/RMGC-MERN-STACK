import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import Gig from "../models/gigModel.js";
import Order from "../models/orderModel.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import Review from "../models/reviewModel.js";
import bcrypt from "bcryptjs";

// Get specific user's data by user ID
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    // Respond with the user's data
    res.status(200).send(user);
  } catch (err) {
    next(err);
  }
};

// Get logged-in user's data (current user)
// controllers/userController.js
const countryToLanguageMap = {
  US: "en", // United States - English
  NG: "en", // Nigeria - English
  FR: "fr", // France - French
  ES: "es", // Spain - Spanish
  DE: "de", // Germany - German
  // Add more mappings as needed
};

const getLanguageFromCountry = (countryCode) => {
  return countryToLanguageMap[countryCode] || "en"; // Default to English if country not found
};

export const getUserData = async (req, res, next) => {
  try {
    let user = null;

    // Check if user is authenticated
    if (req.user?.id) {
      user = await User.findById(req.user.id).select(
        "-password -resetPasswordToken -resetPasswordExpires"
      );
      // Removes sensitive fields
    }

    // If user is NOT logged in → return guest defaults
    if (!user) {
      return res.status(200).json({
        id: null,
        username: "Guest",
        email: "N/A",
        country: "Unknown",
        language: "English",
        role: "guest",
        isSeller: false,
        isAdmin: false,
        img: "https://example.com/default-avatar.png",
        portfolioLink: [],
        languages: [],
        services: [],
        organization: null,
        postedJobs: [],
        vipSubscription: null,
      });
    }

    // Auto-detect language
    const language = getLanguageFromCountry(user.country);

    // Return complete profile
    return res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      img: user.img,
      isSeller: user.isSeller,
      isAdmin: user.isAdmin,
      bio: user.bio,
      country: user.country,
      phone: user.phone,
      desc: user.desc,
      portfolioLink: user.portfolioLink,
      languages: user.languages,
      isVerified: user.isVerified,
      address: user.address,
      yearsOfExperience: user.yearsOfExperience,
      stateOfResidence: user.stateOfResidence,
      countryOfResidence: user.countryOfResidence,
      role: user.role,
      tier: user.tier,

      // Next of Kin
      nextOfKin: {
        fullName: user?.nextOfKin?.fullName || "",
        dob: user?.nextOfKin?.dob || null,
        stateOfResidence: user?.nextOfKin?.stateOfResidence || "",
        countryOfResidence: user?.nextOfKin?.countryOfResidence || "",
        email: user?.nextOfKin?.email || "",
        address: user?.nextOfKin?.address || "",
        phone: user?.nextOfKin?.phone || "",
      },

      // Organization Data
      organization: user.organization
        ? {
            name: user.organization.name,
            regNumber: user.organization.regNumber,
            website: user.organization.website,
            description: user.organization.description,
            verified: user.organization.verified,
            contactEmail: user.organization.contactEmail,
            contactPhone: user.organization.contactPhone,
            logo: user.organization.logo,
            address: user.organization.address,
            state: user.organization.state,
            country: user.organization.country,
            industry: user.organization.industry,
            companySize: user.organization.companySize,
            socialLinks: user.organization.socialLinks,
          }
        : null,

      // VIP Subscription
      // VIP Subscription
      vipSubscription: user.vipSubscription
        ? {
            startDate: user.vipSubscription.startDate,
            endDate: user.vipSubscription.endDate,
            active: user.vipSubscription.active,
            paymentReference: user.vipSubscription.paymentReference,
            transactionId: user.vipSubscription.transactionId,
            gateway: user.vipSubscription.gateway,
            amount: user.vipSubscription.amount,
            currency: user.vipSubscription.currency,
            cardToken: user.vipSubscription.cardToken,

            // FIXED: Return the invoice array
            invoices: Array.isArray(user.vipSubscription.invoices)
              ? user.vipSubscription.invoices
              : [],

            // FIXED: Return last charge
            lastCharge: user.vipSubscription.lastCharge || null,
          }
        : null,

      services: user.services || [],
      postedJobs: user.postedJobs || [],

      language,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error("Error fetching user data:", err);
    next(err);
  }
};

// Delete user by ID
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(createError(404, "User not found"));
    }

    // If the requester is an admin or deleting their own account
    if (req.isAdmin || req.userId === user.id.toString()) {
      // Delete the user
      await User.findByIdAndDelete(req.params.id);

      // Delete all gigs associated with the user
      await Gig.deleteMany({ userId: req.params.id });

      // Delete all orders related to the user (either as seller or buyer)
      await Order.deleteMany({
        $or: [{ sellerId: req.params.id }, { buyerId: req.params.id }],
      });

      // Delete all conversations involving the user
      await Conversation.deleteMany({ members: req.params.id });

      // Delete all messages sent by the user
      await Message.deleteMany({ senderId: req.params.id });

      // Delete all reviews written by the user
      await Review.deleteMany({ UserId: req.params.id });

      // Additional cleanup if necessary
      // Delete any other references to this user in other collections
      // For example, if the user is referenced in payment details, wishlists, or any other collection
      await Payment.deleteMany({ userId: req.params.id });
      await Wishlist.deleteMany({ userId: req.params.id });
      // Add more collections here as necessary

      return res
        .status(200)
        .send("User and all associated data deleted successfully.");
    } else {
      return next(createError(403, "You can only delete your own account!"));
    }
  } catch (err) {
    next(err);
  }
};

export const getSellers = async (req, res, next) => {
  try {
    const sellers = await User.find({ isSeller: true }).select("-password"); // Fetch only sellers without passwords
    res.status(200).json(sellers);
  } catch (err) {
    next(err);
  }
};

// Get all users
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find(); // Fetch all users (not just sellers)
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

// In the controller where you handle profile update:
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { newPassword, organization, ...otherUpdates } = req.body;

    const updatePayload = { ...otherUpdates };

    // Handle password change
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      updatePayload.password = await bcrypt.hash(newPassword, salt);
    }

    // Handle organization fields safely
    if (organization) {
      const safeOrg = { ...organization };

      // Prevent changing regNumber
      if (safeOrg.regNumber) delete safeOrg.regNumber;

      updatePayload.organization = {
        ...(req.user.organization || {}),
        ...safeOrg,
      };
    }

    // Block fields users must not touch
    const blocked = [
      "role",
      "email",
      "isVerified",
      "vipSubscription",
      "postedJobs",
      "createdAt",
      "updatedAt",
      "resetPasswordToken",
      "resetPasswordExpires",
    ];

    blocked.forEach((f) => delete updatePayload[f]);

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updatePayload },
      { new: true }
    ).select("-password");

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const updateOrganization = async (req, res, next) => {
  try {
    // Ensure the user is an organization
    if (!req.user || req.user.role !== "organization") {
      return next(createError(403, "Access denied. Not an organization."));
    }

    const { newPassword, organization, ...otherUpdates } = req.body;

    const updatePayload = { ...otherUpdates };

    // 1️⃣ Update password if provided
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      updatePayload.password = await bcrypt.hash(newPassword, salt);
    }

    // 2️⃣ Update organization info
    if (organization) {
      const safeOrgData = { ...organization };

      // ❌ Do not allow regNumber to be updated
      if (safeOrgData.regNumber) delete safeOrgData.regNumber;

      // Merge new data into existing organization info
      updatePayload.organization = {
        ...(req.user.organization || {}),
        ...safeOrgData,
      };
    }

    // 3️⃣ Block fields the user should not edit
    const blockedFields = [
      "role",
      "email",
      "isVerified",
      "vipSubscription",
      "postedJobs",
      "createdAt",
      "updatedAt",
      "resetPasswordToken",
      "resetPasswordExpires",
    ];
    blockedFields.forEach((field) => delete updatePayload[field]);

    // 4️⃣ Update the organization safely using the JWT ID
    const updatedOrg = await User.findByIdAndUpdate(
      req.user.id, // ✅ always comes from JWT, never from route param
      { $set: updatePayload },
      { new: true }
    );

    if (!updatedOrg) {
      return next(createError(404, "Organization not found"));
    }

    res.status(200).json(updatedOrg);
  } catch (err) {
    next(err);
  }
};

// Get Total Earnings (Revenue)
export const getTotalRevenue = async (req, res, next) => {
  try {
    // Aggregate the total earnings from completed orders associated with this seller
    const totalRevenue = await Order.aggregate([
      { $match: { sellerId: req.userId, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
    res.status(200).json({ revenue });
  } catch (err) {
    next(err);
  }
};
