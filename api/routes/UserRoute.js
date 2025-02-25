import express from "express";
import {
  deleteUser,
  getUser,
  getUserData,
  getSellers,
  getUsers,
  getUserProfile,
  updateUser,
  getTotalRevenue, // Import the new function
} from "../controllers/userController.js";
import { verifySeller, verifyToken } from "../middleware/jwt.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

router.get("/me", getUserData);
router.get("/profile", getUserProfile);
router.get("/", getUsers); // Fetch all users route
router.get("/sellers", getSellers); // Fetch all Sellers route
router.get("/:id", getUser);
router.delete("/:id", deleteUser);

// Get user profile info

// Update user profile info
router.patch("/profile", updateUser);

// Get total revenue (earnings) for the seller
router.get("/revenue", getTotalRevenue);

export default router;
