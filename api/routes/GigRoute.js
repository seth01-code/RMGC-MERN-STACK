import express from "express";
import {
  createGig,
  deleteGig,
  getGig,
  getGigs,
  getGigsWithSales,
  getGigWithSales,
} from "../controllers/gigController.js";

import { verifySeller, verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/", verifyToken, createGig);
router.delete("/:id", verifyToken, deleteGig);
router.get("/single/:id", getGig);
router.get("/", getGigs);
// router.get("/sales/:id", getGigWithSales);
router.get("/gig/:id", verifySeller, getGigWithSales);

// Get all gigs of a seller with sales data
router.get("/gigs", verifySeller, getGigsWithSales);

export default router;
