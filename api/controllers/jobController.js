import Job from "../models/jobModel.js";
import createError from "../utils/createError.js";

/* ===========================
   📌 CREATE JOB (Org Only)
=========================== */
export const createJob = async (req, res, next) => {
  try {
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
=========================== */
export const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find().populate(
      "organizationId",
      "organization.name"
    );
    res.status(200).json(jobs);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 GET SINGLE JOB
=========================== */
export const getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return next(createError(404, "Job not found"));

    res.status(200).json(job);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 GET ORG JOBS
=========================== */
export const getOrganizationJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ organizationId: req.user.id });
    res.status(200).json(jobs);
  } catch (err) {
    next(err);
  }
};
