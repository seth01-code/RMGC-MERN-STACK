import express from "express";
import {
  createJob,
  updateJob,
  deleteJob,
  getAllJobs,
  getJob,
  getOrganizationJobs,
} from "../controllers/jobController.js";

import {
  verifyToken,
  verifyOrganization,
} from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/", verifyToken, verifyOrganization, createJob);
router.put("/:id", verifyToken, verifyOrganization, updateJob);
router.delete("/:id", verifyToken, verifyOrganization, deleteJob);

router.get("/", getAllJobs);
router.get("/organization", verifyToken, verifyOrganization, getOrganizationJobs);
router.get("/:id", getJob);

export default router;
