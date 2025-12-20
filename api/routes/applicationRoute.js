import express from "express";
import {
  applyForJob,
  getJobApplications,
  updateApplicationStatus,
} from "../controllers/applicationController.js";
import {
  verifyToken,
  verifyRemoteWorker,
  verifyOrganization,
} from "../middleware/jwt.js";
import Application from "../models/applicationModel.js"; // for user applications

const router = express.Router();

// Remote worker applies for a job
router.post("/:jobId", verifyToken, verifyRemoteWorker, applyForJob);

// Organization fetches applications for a job
router.get("/:jobId", verifyToken, verifyOrganization, getJobApplications);

// Organization updates application status
router.put("/:id/status", verifyToken, verifyOrganization, updateApplicationStatus);

/* =========================
   Remote worker fetches their own applications
========================= */
router.get(
  "/user",
  verifyToken,
  async (req, res, next) => {
    try {
      const apps = await Application.find({ applicantId: req.user.id }).populate("jobId");
      res.status(200).json(apps);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
