import express from "express";
import {
  analyzeGigMedia,
  analyzeTempGigMedia,
  applyMediaToGig,
  clearGigMedia,
  upload,
} from "../controllers/gigMediaController.js";
import { verifyToken, verifySeller } from "../middleware/jwt.js";

const router = express.Router();

// All routes require a verified seller — buyers cannot use this feature
router.post("/analyze-temp", verifyToken, verifySeller, upload.array("files", 5), analyzeTempGigMedia);
router.post("/analyze/:gigId", verifyToken, verifySeller, upload.array("files", 5), analyzeGigMedia);
router.post("/apply/:gigId", verifyToken, verifySeller, applyMediaToGig);
router.delete("/:gigId", verifyToken, verifySeller, clearGigMedia);

export default router;