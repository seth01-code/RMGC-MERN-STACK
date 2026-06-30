import mongoose from "mongoose";
const { Schema } = mongoose;

const ProposalSchema = new Schema(
  {
    freelancerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    coverLetter: { type: String, required: true, maxlength: 2000 },
    bidAmount: { type: Number, required: true },
    bidCurrency: { type: String, default: "USD" },
    deliveryDays: { type: Number, required: true },
    attachmentUrls: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const WorkSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, required: true },
    skills: { type: [String], default: [] },
    budget: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "expert"],
      required: true,
    },
    locationType: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      required: true,
    },
    location: { type: String, default: null },
    deadline: { type: Date, default: null },
    attachmentUrls: { type: [String], default: [] },
    visibility: { type: String, enum: ["public", "invite"], default: "public" },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "cancelled"],
      default: "open",
    },
    proposals: { type: [ProposalSchema], default: [] },
    acceptedProposalId: { type: Schema.Types.ObjectId, default: null },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    paidAt: { type: Date, default: null },
    savedBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    likedBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true },
);

WorkSchema.virtual("proposalCount").get(function () {
  return this.proposals.length;
});

WorkSchema.virtual("likeCount").get(function () {
  return this.likedBy?.length ?? 0;
});

WorkSchema.virtual("isBooked").get(function () {
  return this.paymentStatus === "paid";
});

WorkSchema.set("toJSON", { virtuals: true });
WorkSchema.set("toObject", { virtuals: true });

export default mongoose.model("Work", WorkSchema);
