import express from "express";
import {
  deleteUser,
  getUser,
  getUserData,
  getSellers,
  getUsers,
  getUserProfile,
  updateUser,
  getTotalRevenue,
  updateOrganization, // Import the new function
} from "../controllers/userController.js";
import {
  verifySeller,
  verifySellerOrOrganization,
  verifyToken,
  verifyTokenOptional,
} from "../middleware/jwt.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

router.get("/me", verifyTokenOptional, getUserData);
router.get("/profile", verifyToken, verifySeller, getUserProfile);
router.get("/", verifyToken, getUsers); // Fetch all users route
router.get("/sellers", getSellers); // Fetch all Sellers route
router.get("/:id", verifyToken, getUser);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

// Get user profile info

// Update user profile info
router.patch("/profile", verifyToken, verifySellerOrOrganization, updateUser);
router.patch("/org-proile", verifyToken, verifySellerOrOrganization, updateOrganization);

// Get total revenue (earnings) for the seller
router.get("/revenue", verifySeller, getTotalRevenue);

export default router;
