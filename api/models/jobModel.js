import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    // Reference to the organization that posted this job
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Core job details
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true }, // e.g. Design, Development, Marketing
    skillsRequired: { type: [String], default: [] },
    locationType: {
      type: String,
      enum: ["remote"], // 🔒 Organization jobs are remote-only
      default: "remote",
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship"],
      default: "contract",
    },

    // Salary range
    salary: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      currency: { type: String, default: "USD" },
    },

    // Applicants — remote workers applying for the job
    applicants: [
      {
        workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        appliedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "reviewed", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],

    // Meta
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false }, // admin moderation
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Job = mongoose.models.Job || mongoose.model("Job", JobSchema);
export default Job;
