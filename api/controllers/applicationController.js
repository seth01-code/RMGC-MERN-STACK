import Application from "../models/applicationModel.js";
import Job from "../models/jobModel.js";
import createError from "../utils/createError.js";

/* ===========================
   📌 APPLY FOR JOB
=========================== */
export const applyForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) return next(createError(404, "Job not found"));
    if (job.status === "closed") return next(createError(400, "Job is closed"));

    const existing = await Application.findOne({
      jobId: job._id,
      applicantId: req.user.id,
    });

    if (existing) return next(createError(400, "You already applied"));

    const app = await Application.create({
      jobId: job._id,
      applicantId: req.user.id,
      cvUrl: req.body.cvUrl,
      coverLetter: req.body.coverLetter,
    });

    res.status(201).json(app);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 GET ALL APPLICATIONS FOR ORG JOBS
=========================== */
export const getJobApplications = async (req, res, next) => {
  try {
    const apps = await Application.find({ jobId: req.params.jobId }).populate("applicantId");

    res.status(200).json(apps);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   📌 UPDATE APPLICATION STATUS
=========================== */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);

    if (!app) return next(createError(404, "Application not found"));

    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};
