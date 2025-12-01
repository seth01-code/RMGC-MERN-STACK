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

const router = express.Router();

router.post("/:jobId", verifyToken, verifyRemoteWorker, applyForJob);
router.get("/:jobId", verifyToken, verifyOrganization, getJobApplications);
router.put(
  "/:id/status",
  verifyToken,
  verifyOrganization,
  updateApplicationStatus
);

export default router;
