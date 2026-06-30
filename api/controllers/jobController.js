import Job from "../models/jobModel.js";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

/* ===========================
   📌 CREATE JOB (Org Only)
=========================== */
export const createJob = async (req, res, next) => {
  try {
    // Block suspended organizations from posting jobs
    const org = await User.findById(req.user.id).select("suspended");
    if (org?.suspended)
      return next(createError(403, "Your account has been suspended."));

    const job = await Job.create({
      ...req.body,
      organizationId: req.user.id,
    });

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 EDIT JOB
=========================== */
export const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return next(createError(404, "Job not found"));
    if (job.organizationId.toString() !== req.user.id)
      return next(createError(403, "Not authorized"));

    // Block suspended organizations from editing
    const org = await User.findById(req.user.id).select("suspended");
    if (org?.suspended)
      return next(createError(403, "Your account has been suspended."));

    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 DELETE JOB
=========================== */
export const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return next(createError(404, "Job not found"));
    if (job.organizationId.toString() !== req.user.id)
      return next(createError(403, "Not authorized"));

    await job.deleteOne();
    res.status(200).json({ message: "Job deleted successfully" });
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 GET ALL JOBS
   Excludes jobs posted by suspended organizations
=========================== */
export const getAllJobs = async (req, res, next) => {
  try {
    // Get IDs of all suspended organizations so we can exclude their jobs
    const suspendedOrgs = await User.find({
      suspended: true,
      role: "organization",
    }).select("_id");
    const suspendedOrgIds = suspendedOrgs.map((u) => u._id);

    const jobs = await Job.find({
      organizationId: { $nin: suspendedOrgIds },
    }).populate("organizationId", "organization.name");

    res.status(200).json(jobs);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 GET SINGLE JOB
   Returns 404 if posted by a suspended organization
=========================== */
export const getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "organizationId",
      "suspended"
    );
    if (!job) return next(createError(404, "Job not found"));

    if (job.organizationId?.suspended)
      return next(createError(404, "Job not found"));

    res.status(200).json(job);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 GET ORG JOBS
   Org can still see their own jobs even if suspended
   (admin/internal view — suspension is handled at login)
=========================== */
export const getOrganizationJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ organizationId: req.user.id });
    res.status(200).json(jobs);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 APPLY TO JOB
   Add this to your apply route handler.
   Remote workers who are suspended cannot apply.
=========================== */
export const applyToJob = async (req, res, next) => {
  try {
    const applicant = await User.findById(req.user.id).select("suspended");
    if (applicant?.suspended)
      return next(
        createError(403, "Your account has been suspended. You cannot apply to jobs.")
      );

    const job = await Job.findById(req.params.id).populate(
      "organizationId",
      "suspended"
    );
    if (!job) return next(createError(404, "Job not found"));

    // Also block applying to a suspended org's job
    if (job.organizationId?.suspended)
      return next(createError(404, "Job not found"));

    // --- your existing apply logic continues here ---

    res.status(200).json({ message: "Application submitted." });
  } catch (err) {
    next(err);
  }
};