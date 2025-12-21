// routes/flutterwaveFreelancerRoutes.js
import express from "express";
import { flutterwaveFreelancerIntent } from "../controllers/flutterwaveFreelancerController.js";

const router = express.Router();

// Create a payment link for freelancer registration
// POST /api/flutterwave/freelancer
router.post("/freelancer", flutterwaveFreelancerIntent);

// ✅ Optional: You can add success webhook or endpoint later
// router.get("/freelancer/success", flutterwaveFreelancerSuccess);

export default router;
