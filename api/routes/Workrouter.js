import express from "express";
import {
  createWork,
  updateWork,
  deleteWork,
  getAllWork,
  getWork,
  getClientWork,
  submitProposal,
  withdrawProposal,
  acceptProposal,
  rejectProposal,
  closeWork,
  markWorkAsBooked,
  getMyProposals,
  getWorkProposals,
  getWorkProposalsForSeller,
  saveWork,
  likeWork,
  getSavedWork,
  getLikedWork,
} from "../controllers/Workcontroller.js";
import { verifyToken, verifyTokenOptional } from "../middleware/jwt.js";

const router = express.Router();

router.get("/", verifyTokenOptional, getAllWork);
router.get("/client/posts", verifyToken, getClientWork);
router.get("/freelancer/proposals", verifyToken, getMyProposals);
router.get("/freelancer/saved", verifyToken, getSavedWork);
router.get("/freelancer/liked", verifyToken, getLikedWork);

router.post("/", verifyToken, createWork);
router.get("/:id", getWork);
router.put("/:id", verifyToken, updateWork);
router.delete("/:id", verifyToken, deleteWork);
router.patch("/:id/close", verifyToken, closeWork);
router.patch("/:id/book", verifyToken, markWorkAsBooked);
router.patch("/:id/save", verifyToken, saveWork);
router.patch("/:id/like", verifyToken, likeWork);

router.get("/:id/proposals/applicants", verifyToken, getWorkProposalsForSeller);
router.get("/:id/proposals", verifyToken, getWorkProposals);
router.post("/:id/proposals", verifyToken, submitProposal);
router.patch(
  "/:id/proposals/:proposalId/withdraw",
  verifyToken,
  withdrawProposal,
);
router.patch("/:id/proposals/:proposalId/accept", verifyToken, acceptProposal);
router.patch("/:id/proposals/:proposalId/reject", verifyToken, rejectProposal);

export default router;
