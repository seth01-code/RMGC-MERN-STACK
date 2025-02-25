import express from 'express';
import { getSellerAnalytics } from '../controllers/SellerAnalytics.js';

const router = express.Router();

router.get('/analytics/:sellerId', getSellerAnalytics);

export default router;
