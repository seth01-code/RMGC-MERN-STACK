import Conversation from "../models/ConversationModel.js";
import mongoose from "mongoose";

// Create or get an existing conversation

export const createOrGetConversation = async (req, res) => {
  try {
    let { userId, otherUserId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    userId = new mongoose.Types.ObjectId(userId);
    otherUserId = new mongoose.Types.ObjectId(otherUserId);

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, otherUserId],
        lastMessage: { text: "", mediaType: "text" },
      });

      await conversation.save();
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Error creating conversation: " + error.message });
  }
};


export const getConversations = async (req, res) => {
  const { userId } = req.params;

  try {
    const conversations = await Conversation.find({
      participants: userId,
    }).populate("participants", "username img"); // Populate participants' username and image

    // Format conversations to exclude the logged-in user from participants
    const formattedConversations = conversations.map((conversation) => {
      const otherParticipant = conversation.participants.find(
        (participant) => participant._id.toString() !== userId
      );

      return {
        _id: conversation._id,
        otherParticipant, // The other user's info (id, username, img)
        lastMessage: conversation.lastMessage,
        updatedAt: conversation.updatedAt,
      };
    });

    res.status(200).json(formattedConversations);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching conversations: " + error.message });
  }
};


export const getAllConversations = async (req, res) => {
  try {
    // Ensure only admins can access this route
   

    // Fetch all conversations, including participants
    const conversations = await Conversation.find({})
      .populate("participants", "username img") // Populate participants' details
      .sort({ updatedAt: -1 }); // Sort by latest updates

    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: "Error fetching all conversations: " + error.message });
  }
};

export const getSingleConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID format." });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "username img") // Populate participants' username and image
      .exec();

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Error fetching conversation: " + error.message });
  }
};
