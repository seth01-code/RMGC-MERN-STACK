import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    description: { type: String, required: true },

    salaryRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: "NGN" },
    },

    location: { type: String, default: "Remote" },

    experienceLevel: { type: String, required: true },

    industry: { type: String, required: true },

    requirements: { type: [String], default: [] },

    responsibilities: { type: [String], default: [] },

    benefits: { type: [String], default: [] },

    deadline: { type: Date, required: true },

    status: { type: String, enum: ["Active", "Closed"], default: "Active" },

    type: { type: String, default: "remote" },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Job", JobSchema);
