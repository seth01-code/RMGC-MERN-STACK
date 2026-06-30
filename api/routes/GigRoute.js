import express from "express";
import {
  createGig,
  deleteGig,
  getGig,
  getGigs,
  getGigsWithSales,
  getGigWithSales,
  getUserGigs,
} from "../controllers/gigController.js";

import gigMediaRouter from "./gigMediaRouter.js";


import { verifySeller, verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/", verifyToken, createGig);
router.delete("/:id", verifyToken, deleteGig);
router.get("/single/:id", getGig);
router.get("/", getGigs);
// router.get("/sales/:id", getGigWithSales);
router.get("/gig/:id", verifySeller, getGigWithSales);

router.get("/user/:userId", getUserGigs);

// after your existing routes:
router.use("/media", gigMediaRouter);

// Get all gigs of a seller with sales data
router.get("/gigs", verifySeller, getGigsWithSales);

export default router;
