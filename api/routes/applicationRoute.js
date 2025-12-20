import express from "express";
import {
  applyForJob,
  getJobApplications,
  updateApplicationStatus,
  getUserApplications,
} from "../controllers/applicationController.js";
import { verifyToken, verifyRemoteWorker, verifyOrganization } from "../middleware/jwt.js";

const router = express.Router();

// Remote worker applies for a job
router.post("/:jobId", verifyToken, verifyRemoteWorker, applyForJob);

// Organization fetches applications for a job
router.get("/:jobId", verifyToken, verifyOrganization, getJobApplications);

// Organization updates application status
router.put("/:id/status", verifyToken, verifyOrganization, updateApplicationStatus);

// Remote worker fetches their own applications
router.get("/user", verifyToken, verifyRemoteWorker, getUserApplications);

export default router;
