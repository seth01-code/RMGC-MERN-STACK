import express from "express";
import upload from "../middleware/upload.js"; // Multer middleware
import { sendMessage, getMessages, deleteMessage } from "../controllers/messageController.js";
import {verifyToken} from '../middleware/jwt.js'

const router = express.Router();

router.post("/send", upload.single("media"), sendMessage); // Send a message (with optional media)
router.get("/:conversationId", getMessages); // Get messages for a conversation
router.delete("/:messageId", verifyToken, deleteMessage);

export default router;
