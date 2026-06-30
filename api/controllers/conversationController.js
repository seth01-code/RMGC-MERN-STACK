import Conversation from "../models/conversationModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";

// Create or get an existing conversation
export const createOrGetConversation = async (req, res) => {
  try {
    let { userId, otherUserId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(otherUserId)
    ) {
      return res.status(400).json({ error: "Invalid user ID format." });
    }

    userId = new mongoose.Types.ObjectId(userId);
    otherUserId = new mongoose.Types.ObjectId(otherUserId);

    // Block conversation if either party is suspended
    const [user, otherUser] = await Promise.all([
      User.findById(userId).select("suspended isAdmin"),
      User.findById(otherUserId).select("suspended isAdmin"),
    ]);

    if (!user || !otherUser) {
      return res.status(404).json({ error: "One or both users not found." });
    }

    if (user.suspended && !user.isAdmin) {
      return res.status(403).json({ error: "Your account has been suspended." });
    }

    if (otherUser.suspended && !otherUser.isAdmin) {
      return res.status(404).json({ error: "User not found." });
    }

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
    res
      .status(500)
      .json({ error: "Error creating conversation: " + error.message });
  }
};

export const getConversations = async (req, res) => {
  const { userId } = req.params;

  try {
    const conversations = await Conversation.find({
      participants: userId,
    }).populate("participants", "username img suspended isAdmin");

    // Filter out conversations where the other participant is suspended,
    // then format to exclude the logged-in user from the participants list
    const formattedConversations = conversations
      .filter((conversation) => {
        const other = conversation.participants.find(
          (p) => p._id.toString() !== userId
        );
        // Keep the conversation only if the other user exists and isn't suspended
        return other && (!other.suspended || other.isAdmin);
      })
      .map((conversation) => {
        const otherParticipant = conversation.participants.find(
          (p) => p._id.toString() !== userId
        );

        return {
          _id: conversation._id,
          otherParticipant,
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
    // Admins see everything — no suspension filter here
    const conversations = await Conversation.find({})
      .populate("participants", "username img suspended")
      .sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching all conversations: " + error.message });
  }
};

export const getSingleConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID format." });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "username img suspended isAdmin")
      .exec();

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // Hide the conversation if any non-admin participant is suspended
    const hasSuspended = conversation.participants.some(
      (p) => p.suspended && !p.isAdmin
    );
    if (hasSuspended) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    res.status(200).json(conversation);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching conversation: " + error.message });
  }
};