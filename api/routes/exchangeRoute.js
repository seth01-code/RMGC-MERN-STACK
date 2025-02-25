// routes/exchangeRate.js
import express from 'express';
import { getExchangeRate } from '../utils/getExchangeRate.js';
import { getCurrencySymbol } from '../utils/getCurrencySymbol.js';

const router = express.Router();

// Endpoint to fetch exchange rate based on user's country
router.get('/exchange-rate', async (req, res) => {
  const { currency } = req.query;  // The user's country code (e.g., 'NGN' for Nigeria)
  
  if (!currency) {
    return res.status(400).json({ message: "Currency code is required" });
  }

  try {
    const exchangeRate = await getExchangeRate(currency);
    const symbol = getCurrencySymbol(currency);
    
    res.status(200).json({ rate: exchangeRate, symbol });
  } catch (err) {
    res.status(500).json({ message: "Error fetching exchange rate", error: err.message });
  }
});

export default router;
