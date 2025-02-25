import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId, text, media } = req.body;

    const newMessage = new Message({
      conversationId,
      senderId,
      text,
      media: media || "",
      messageStatus: "sent", // Default message status
    });

    await newMessage.save();

    // Determine last message type
    let lastMessageUpdate = {};
    if (media) {
      const fileType = media.split(".").pop();
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileType)) {
        lastMessageUpdate = { text: "Photo", mediaType: "image" };
      } else if (["mp4", "mov", "avi", "mkv"].includes(fileType)) {
        lastMessageUpdate = { text: "Video", mediaType: "video" };
      } else if (["mp3", "wav", "ogg", "m4a"].includes(fileType)) {
        lastMessageUpdate = { text: "Voice", mediaType: "audio" };
      } else if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(fileType)) {
        lastMessageUpdate = { text: "Document", mediaType: "document" };
      }
    } else {
      lastMessageUpdate = { text, mediaType: "text" };
    }

    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, { lastMessage: lastMessageUpdate });

    res.status(200).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Error sending message: " + error.message });
  }
};



// Get messages for a specific conversation
export const getMessages = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const messages = await Message.find({ conversationId })
      .populate("senderId", "username profilePicture")
      .sort({ createdAt: 1 }); // Sort messages by creation time (ascending)

    res.status(200).json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching messages: " + error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body; // Flag to check if it should be deleted for both users
    const userId = req.user.id; // Authenticated user ID

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const otherUserId = conversation.users.find((id) => id.toString() !== userId);

    if (deleteForEveryone) {
      // Hard delete: Remove the message completely for both users
      await Message.findByIdAndDelete(messageId);
      return res.status(200).json({ message: "Message deleted for everyone" });
    } else {
      // Soft delete: Hide the message only for the current user
      if (!message.deletedBy) {
        message.deletedBy = [];
      }
      if (!message.deletedBy.includes(userId)) {
        message.deletedBy.push(userId);
      }

      await message.save();
      return res.status(200).json({ message: "Message deleted for you" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error deleting message: " + error.message });
  }
};

