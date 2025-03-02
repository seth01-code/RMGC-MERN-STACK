import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import Gig from "../models/gigModel.js";
import Order from "../models/orderModel.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import Review from "../models/reviewModel.js";
import bcrypt from "bcrypt";

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
    if (req.user && req.user.id) {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      // Return default values when no user is found
      return res.status(200).send({
        username: "Guest",
        email: "N/A",
        country: "Unknown",
        language: "English", // Default language
      });
    }

    const language = getLanguageFromCountry(user.country);

    res.status(200).send({
      username: user.username,
      email: user.email,
      country: user.country,
      language: language,
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
export const updateUser = async (req, res, next) => {
  try {
    const { newPassword, ...updatedData } = req.body;

    // If the password is being updated, hash the new password
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      updatedData.password = await bcrypt.hash(newPassword, salt);
    }

    // Update the user in the database
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updatedData, {
      new: true,
    });

    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
};

// Get Seller Profile
export const getUserProfile = async (req, res) => {
  try {
    // console.log("Fetching seller profile for user:", req.user);

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
