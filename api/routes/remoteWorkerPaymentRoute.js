// routes/remoteWorkerPaymentRoutes.js
import express from "express";
import {
  subscribeNGN,
  subscribeUSD,
  subscribeGBP,
  subscribeEUR,
} from "../controllers/remoteWorkerPaymentController.js";

import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/remoteWorker/subscribe/ngn", verifyToken, subscribeNGN);
router.post("/remoteWorker/subscribe/usd", verifyToken, subscribeUSD);
router.post("/remoteWorker/subscribe/gbp", verifyToken, subscribeGBP);
router.post("/remoteWorker/subscribe/eur", verifyToken, subscribeEUR);

export default router;
