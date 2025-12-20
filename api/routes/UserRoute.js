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
  updateOrganization,
} from "../controllers/userController.js";

import {
  verifyOrganization,
  verifySeller,
  verifySellerOrOrganization,
  verifyToken,
  verifyTokenOptional,
  verifyRemoteWorker,
} from "../middleware/jwt.js";

import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// ───────── STATIC ROUTES (no params) ─────────
router.get("/me", verifyTokenOptional, getUserData);

router.get("/profile", verifyToken, verifySellerOrOrganization, verifyRemoteWorker, getUserProfile);
router.patch("/profile", verifyToken, verifySellerOrOrganization, verifyRemoteWorker, updateUser);

router.patch(
  "/org-profile",
  verifyToken,
  verifyOrganization,
  updateOrganization
);

router.get("/revenue", verifySeller, getTotalRevenue);

router.get("/", verifyToken, getUsers);
router.get("/sellers", getSellers);

// ───────── DYNAMIC ROUTES (must always be last) ─────────
router.get("/:id", verifyToken, getUser);
router.delete("/:id", verifyToken, verifyAdmin, deleteUser);

export default router;
