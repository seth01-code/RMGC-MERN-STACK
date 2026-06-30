import mongoose from "mongoose";
const { Schema } = mongoose;

const TranscriptEntrySchema = new Schema(
  {
    speakerId: { type: String, required: true },
    speakerName: { type: String, default: "" }, // snapshot, survives username changes
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MeetingSchema = new Schema(
  {
    gigId: { type: String, required: true },
    gigTitle: { type: String, required: true }, // snapshot so emails/history survive gig edits
    buyerId: { type: String, required: true },
    sellerId: { type: String, required: true },
    proposedTime: { type: Date, required: true },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled", "completed"],
      default: "pending",
    },
    declineReason: { type: String, default: "" },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    transcript: { type: [TranscriptEntrySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);