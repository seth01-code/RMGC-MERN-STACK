import express from "express";
import {
  analyzePortfolio,
  analyzeTempPortfolio,
  applyPortfolioToProfile,
  clearPortfolio,
  getTopPortfolioUsers,
  upload,
} from "../controllers/portfolioController.js";
import { verifyToken } from "../middleware/jwt.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// POST /api/portfolio/analyze/:userId
// Admin uploads files and/or a URL → Gemini extracts → saves to user.portfolio
router.post(
  "/analyze/:userId",
  verifyToken,
  verifyAdmin,
  upload.array("files", 10), // up to 10 files
  analyzePortfolio,
);

router.post("/analyze-temp", upload.array("files", 5), analyzeTempPortfolio);
router.get("/top", getTopPortfolioUsers);

// POST /api/portfolio/apply/:userId
// Admin applies extracted portfolio data to the user's profile fields
router.post(
  "/apply/:userId",
  verifyToken,
  verifyAdmin,
  applyPortfolioToProfile,
);

// DELETE /api/portfolio/:userId
// Admin clears a user's portfolio object
router.delete("/:userId", verifyToken, verifyAdmin, clearPortfolio);

export default router;
