import express from "express";
import {
  getOverview,
  getGrowth,
  getUserAnalytics,
  getOrderAnalytics,
  getGigAnalytics,
  getReviewAnalytics,
  getJobAnalytics,
} from "../controllers/analyticsController.js";
import { verifyToken } from "../middleware/jwt.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// All routes admin-only
router.use(verifyToken, verifyAdmin);

router.get("/overview", getOverview);
router.get("/growth",   getGrowth);
router.get("/users",    getUserAnalytics);
router.get("/orders",   getOrderAnalytics);
router.get("/gigs",     getGigAnalytics);
router.get("/reviews",  getReviewAnalytics);
router.get("/jobs",     getJobAnalytics);

export default router;

// ── Register in your main app.js / index.js ──────────────────
// import analyticsRoutes from "./routes/analyticsRoutes.js";
// app.use("/api/analytics", analyticsRoutes);