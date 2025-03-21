import { useState, useEffect } from "react";
import axios from "axios";

// Country-to-Currency mapping
const countryToCurrencyMap = {
  Nigeria: "NGN",
  "United States": "USD",
  Canada: "CAD",
  UK: "GBP",
  Germany: "EUR",
  India: "INR",
  SouthAfrica: "ZAR",
  Kenya: "KES",
  Ghana: "GHS",
  Egypt: "EGP",
};

// Replace with your actual API key from ExchangeRate-API
// const EXCHANGE_RATE_API_KEY = "902808eb79568366ee7009e6";
const BASE_CURRENCY = "USD"; // Base currency for conversion

export const useExchangeRate = (country) => {
  const [exchangeRate, setExchangeRate] = useState(1);
  const [currencySymbol, setCurrencySymbol] = useState("$");

  // Determine the currency code based on the country
  const formattedCountry = typeof country === "string" ? country.trim() : "";
  const countryCurrency = countryToCurrencyMap[formattedCountry] || "USD";

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const res = await axios.get(
          `https://api.exchangerate-api.com/v4/latest/${BASE_CURRENCY}`
        );

        if (res.data.rates && res.data.rates[countryCurrency]) {
          const rate = res.data.rates[countryCurrency];
          setExchangeRate(rate);
          setCurrencySymbol(getCurrencySymbol(countryCurrency));
        } else {
          setExchangeRate(1);
          setCurrencySymbol("$");
        }
      } catch (err) {
        console.error("Error fetching exchange rate:", err);
        setExchangeRate(1);
        setCurrencySymbol("$");
      }
    };

    fetchExchangeRate();

    fetchExchangeRate();
  }, [countryCurrency]);

  const convertPrice = (price, originalCurrency = "USD") => {
    const targetCurrency = countryToCurrencyMap[formattedCountry] || "USD";

    if (originalCurrency === targetCurrency) {
      return parseFloat(price);
    }

    return parseFloat(price) * exchangeRate;
  };

  return { exchangeRate, currencySymbol, convertPrice, countryCurrency };
};

// Function to get currency symbol based on currency code
const getCurrencySymbol = (currencyCode) => {
  const currencySymbols = {
    USD: "$", // US Dollar (USA)
    CAD: "C$", // Canadian Dollar (Canada)
    GBP: "£", // British Pound (UK)
    EUR: "€", // Euro (Germany)
    INR: "₹", // Indian Rupee (India)
    NGN: "₦", // Nigerian Naira (Nigeria)
    ZAR: "R", // South African Rand (South Africa)
    KES: "KSh", // Kenyan Shilling (Kenya)
    GHS: "GH₵", // Ghanaian Cedi (Ghana)
    EGP: "E£", // Egyptian Pound (Egypt)
  };

  return currencySymbols[currencyCode] || "$";
};
