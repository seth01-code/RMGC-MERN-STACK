import express from "express";
import { verifyToken } from "../middleware/jwt.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import { getAdminDashboard } from "../controllers/adminController.js";

const router = express.Router();

router.get("/dashboard", verifyToken, verifyAdmin, getAdminDashboard);

export default router;
