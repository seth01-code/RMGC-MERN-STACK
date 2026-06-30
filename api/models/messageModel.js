import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    media: {
      type: String,
      default: null,
    },
    messageStatus: {
      type: String,
      default: "sent",
    },
    mediaType: {
      type: String,
      enum: ["image", "video", "audio", "document", "missed_call", null],
      default: null,
    },
    callType: {
      type: String,
      enum: ["audio", "video", null],
      default: null,
    },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
      },
    ],
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;