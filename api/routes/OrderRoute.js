import express from "express";
import { verifyToken } from "../middleware/jwt.js";
import {
//   createOrder,
  getOrder,
  intent,
  confirm,
} from "../controllers/orderController.js";

const router = express.Router();

// router.post("/:id", verifyToken, createOrder);
router.get("/", verifyToken, getOrder);
router.post("/create-payment-intent/:id", verifyToken, intent);
router.put("/", verifyToken, confirm);

export default router;
