import express from "express";
import {
  subscribeNGN,
  subscribeUSD,
  subscribeGBP,
  subscribeEUR,
} from "../controllers/organizationPaymentController.js";

import { verifyToken } from "../middleware/jwt.js";

const router = express.Router();

router.post("/organization/subscribe/ngn", verifyToken, subscribeNGN);
router.post("/organization/subscribe/usd", verifyToken, subscribeUSD);
router.post("/organization/subscribe/gbp", verifyToken, subscribeGBP);
router.post("/organization/subscribe/eur", verifyToken, subscribeEUR);

export default router;
