import mongoose from "mongoose";

const ReactionSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    reaction: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Reaction = mongoose.model("Reaction", ReactionSchema);
export default Reaction;
