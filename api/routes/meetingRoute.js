import express from "express";
import {
  requestMeeting,
  respondToMeeting,
  cancelMeeting,
  completeMeeting,
  getMyMeetings,
  getMeetingById,
  addTranscriptEntry,
  getTranscript,
} from "../controllers/meetingController.js";
import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/request", verifyToken, requestMeeting);
router.get("/mine", verifyToken, getMyMeetings);
router.get("/:id", verifyToken, getMeetingById);
router.patch("/:id/respond", verifyToken, respondToMeeting);
router.patch("/:id/cancel", verifyToken, cancelMeeting);
router.patch("/:id/complete", verifyToken, completeMeeting);
router.post("/:id/transcript", verifyToken, addTranscriptEntry);
router.get("/:id/transcript", verifyToken, getTranscript);

export default router;