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
      type: String, // URL to Cloudinary media file (image, video, document, etc.)
      default: null, // Make it optional
    },
    messageStatus: {
      type: String, // 'sent', 'delivered', 'seen'
      default: "sent",
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
      },
    ],

    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Check if the model already exists, if so, don't redefine it
const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
