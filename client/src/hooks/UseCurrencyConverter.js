import { useState, useEffect } from "react";
import axios from "axios";

const countryToCurrencyMap = {
  Afghanistan: "AFN",
  Albania: "ALL",
  Algeria: "DZD",
  Andorra: "EUR",
  Angola: "AOA",
  Argentina: "ARS",
  Australia: "AUD",
  Austria: "EUR",
  Bangladesh: "BDT",
  Belgium: "EUR",
  Brazil: "BRL",
  Canada: "CAD",
  China: "CNY",
  Egypt: "EGP",
  France: "EUR",
  Germany: "EUR",
  Ghana: "GHS",
  India: "INR",
  Indonesia: "IDR",
  Italy: "EUR",
  Japan: "JPY",
  Kenya: "KES",
  Mexico: "MXN",
  Netherlands: "EUR",
  Nigeria: "NGN",
  Pakistan: "PKR",
  Philippines: "PHP",
  Russia: "RUB",
  Saudi Arabia: "SAR",
  South Africa: "ZAR",
  Spain: "EUR",
  Sweden: "SEK",
  Switzerland: "CHF",
  Thailand: "THB",
  Turkey: "TRY",
  UAE: "AED",
  UK: "GBP",
  USA: "USD",
  Vietnam: "VND",
};

const useCurrencyConverter = (amountUSD, userCountry) => {
  const [convertedAmount, setConvertedAmount] = useState(amountUSD);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (!userCountry || !amountUSD) return;

      const userCurrency = countryToCurrencyMap[userCountry] || "USD";
      setCurrency(userCurrency);

      if (userCurrency === "USD") {
        setConvertedAmount(amountUSD);
        return;
      }

      try {
        const response = await axios.get(
          `https://api.exchangerate-api.com/v4/latest/USD`
        );

        const exchangeRate = response.data.rates[userCurrency] || 1;
        setConvertedAmount((amountUSD * exchangeRate).toFixed(2));
      } catch (error) {
        console.error("Error fetching exchange rate:", error);
      }
    };

    fetchExchangeRate();
  }, [amountUSD, userCountry]);

  return { convertedAmount, currency };
};

export default useCurrencyConverter;
