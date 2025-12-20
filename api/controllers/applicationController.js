import Application from "../models/applicationModel.js";
import Job from "../models/jobModel.js";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

/* ===========================
   📌 APPLY FOR A JOB (REMOTE WORKER)
=========================== */
export const applyForJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { cvUrl, coverLetter = "" } = req.body;

    // Basic validation
    if (!cvUrl) {
      return next(createError(400, "CV link is required"));
    }

    // Ensure user exists
    const user = await User.findById(req.user.id);
    if (!user) return next(createError(401, "Unauthorized"));

    if (req.user.role !== "remote_worker") {
      return next(createError(403, "Only remote workers can apply"));
    }

    // Check job
    const job = await Job.findById(jobId);
    if (!job) return next(createError(404, "Job not found"));
    if (job.status === "closed") {
      return next(createError(400, "Job is closed"));
    }

    // Prevent duplicate applications
    const existing = await Application.findOne({
      jobId: job._id,
      applicantId: user._id,
    });

    if (existing) {
      return next(createError(400, "You already applied for this job"));
    }

    // Create application
    const application = await Application.create({
      jobId: job._id,
      applicantId: user._id,
      cvUrl,
      coverLetter,
    });

    res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 GET ALL APPLICATIONS FOR A JOB (ORGANIZATION)
=========================== */
export const getJobApplications = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) return next(createError(404, "Job not found"));

    // Authorization: only owning organization or admin
    if (req.user.role !== "organization" && !req.user.isAdmin) {
      return next(createError(403, "Access denied"));
    }

    if (
      req.user.role === "organization" &&
      job.organization.toString() !== req.user.id
    ) {
      return next(createError(403, "You do not own this job"));
    }

    const applications = await Application.find({ jobId })
      .populate("applicantId", "username email img portfolioLink country")
      .sort({ createdAt: -1 });

    res.status(200).json(applications);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 UPDATE APPLICATION STATUS (ORGANIZATION)
=========================== */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["pending", "reviewed", "accepted", "rejected"];
    if (!allowedStatuses.includes(status)) {
      return next(createError(400, "Invalid application status"));
    }

    const application = await Application.findById(id).populate("jobId");
    if (!application) {
      return next(createError(404, "Application not found"));
    }

    // Authorization
    if (req.user.role !== "organization" && !req.user.isAdmin) {
      return next(createError(403, "Access denied"));
    }

    if (
      req.user.role === "organization" &&
      application.jobId.organization.toString() !== req.user.id
    ) {
      return next(createError(403, "You do not own this job"));
    }

    application.status = status;
    await application.save();

    res.status(200).json({
      message: "Application status updated",
      application,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   📌 GET APPLICATIONS FOR LOGGED-IN REMOTE WORKER
========================= */
export const getUserApplications = async (req, res, next) => {
  try {
    if (req.user.role !== "remote_worker") {
      return next(createError(403, "Access denied"));
    }

    const applications = await Application.find({
      applicantId: req.user.id,
    })
      .populate({
        path: "jobId",
        select: "title salaryRange type status organizationId",
        populate: { path: "organizationId", select: "name" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(applications);
  } catch (err) {
    next(err);
  }
};
