import User from "../models/userModel.js";
import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import nodemailer from "nodemailer";

// Assume you have this transporter set up somewhere globally or here:
const transporter = nodemailer.createTransport({
  service: "Gmail", // or your mail service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, senderId, text, media } = req.body;

    const newMessage = new Message({
      conversationId,
      senderId,
      text,
      media: media || "",
      messageStatus: "sent",
    });

    await newMessage.save();

    // Determine last message type
    let lastMessageUpdate = {};
    if (media) {
      const fileType = media.split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileType)) {
        lastMessageUpdate = { text: "Photo", mediaType: "image" };
      } else if (["mp4", "mov", "avi", "mkv"].includes(fileType)) {
        lastMessageUpdate = { text: "Video", mediaType: "video" };
      } else if (["mp3", "wav", "ogg", "m4a"].includes(fileType)) {
        lastMessageUpdate = { text: "Voice", mediaType: "audio" };
      } else if (
        ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(fileType)
      ) {
        lastMessageUpdate = { text: "Document", mediaType: "document" };
      }
    } else {
      lastMessageUpdate = { text, mediaType: "text" };
    }

    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: lastMessageUpdate,
    });

    // Fetch conversation to get participants
    const conversation = await Conversation.findById(conversationId).populate(
      "participants",
      "email username"
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Get recipient(s) excluding the sender
    const recipients = conversation.participants.filter(
      (p) => p._id.toString() !== senderId
    );

    // Fetch sender username for email content
    const sender = await User.findById(senderId);

    // Send email notification to each recipient
    for (const recipient of recipients) {
      if (!recipient.email) continue; // Skip if no email

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject: `New message from ${sender.username}`,
        html: `
          <div style="
            font-family: Arial, sans-serif; 
            background-color: #fff; 
            color: #333; 
            padding: 20px; 
            border-radius: 8px; 
            max-width: 600px; 
            margin: auto;
            border: 2px solid #FFA500; /* orange border */
          ">
            <h2 style="color: #FFA500; margin-bottom: 0;">New message from ${
              sender.username
            }</h2>
            <p style="font-size: 16px; line-height: 1.5; margin-top: 8px;">
              You have received a new message:
            </p>
            <div style="
              background-color: #FFA500; 
              color: white; 
              padding: 15px; 
              border-radius: 6px; 
              font-style: italic;
              margin: 20px 0;
            ">
              ${text ? text.replace(/\n/g, "<br>") : "[Media message]"}
            </div>
            <p style="font-size: 14px; color: #666;">
              Please <a href="https://www.renewedmindsglobalconsult.com" style="color: #FFA500; font-weight: bold; text-decoration: none;">check the website</a> to reply.
            </p>
            <hr style="border: none; border-top: 1px solid #FFA500; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from <strong style="color: #FFA500;">RMGC</strong>
            </p>
          </div>
        `,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("Failed to send email to", recipient.email, err);
        } else {
          console.log("Email sent to", recipient.email, info.response);
        }
      });
    }

    res.status(200).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
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

    const otherUserId = conversation.users.find(
      (id) => id.toString() !== userId
    );

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
