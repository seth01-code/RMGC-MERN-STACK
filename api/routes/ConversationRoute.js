import express from "express";
import {
  createOrGetConversation,
  getConversations,
  getAllConversations,
  getSingleConversation,
} from "../controllers/conversationController.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

router.post("/", createOrGetConversation); // Create or get a conversation
router.get("/:userId", getConversations); // Get all conversations for a specific user
router.get("/", getAllConversations); // Admin-only route to fetch ALL conversations
router.get("/single/:conversationId", getSingleConversation); // Get a single conversation by ID

export default router;
