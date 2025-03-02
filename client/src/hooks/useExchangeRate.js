import { useState, useEffect } from "react";
import axios from "axios";

// Country-to-Currency mapping
const countryToCurrencyMap = {
  Nigeria: "NGN",
  "United States": "USD",
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
          `https://v6.exchangerate-api.com/v6/902808eb79568366ee7009e6/latest/${BASE_CURRENCY}`
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
    AFN: "؋",
    ALL: "Lek",
    DZD: "د.ج",
    EUR: "€",
    AOA: "Kz",
    XCD: "$",
    ARS: "$",
    AMD: "դր.",
    AUD: "$",
    AZN: "ман.",
    BSD: "$",
    BHD: "د.ب",
    BDT: "৳",
    BBD: "$",
    BYN: "Br",
    BAM: "KM",
    BWP: "P",
    BRL: "R$",
    BND: "$",
    BGN: "лв.",
    CFA: "CFA",
    BIF: "FBu",
    CVE: "$",
    KHR: "៛",
    CAD: "$",
    CDF: "Fr",
    CLP: "$",
    CNY: "¥",
    COP: "$",
    CRC: "₡",
    HRK: "kn",
    CUP: "$",
    CZK: "Kč",
    DKK: "kr.",
    DJF: "Fdj",
    DOP: "$",
    USD: "$",
    EGP: "ج.م",
    GEL: "ლ",
    GHS: "₵",
    HUF: "Ft",
    ISK: "kr",
    INR: "₹",
    IDR: "Rp",
    ILS: "₪",
    JMD: "$",
    NGN: "₦",
    JPY: "¥",
    KES: "KSh",
    KRW: "₩",
    KWD: "د.ك",
    MYR: "RM",
    MXN: "$",
    MDL: "L",
    PHP: "₱",
    QAR: "QR",
    RUB: "₽",
    SAR: "ر.س",
    SGD: "$",
    ZAR: "R",
    SEK: "kr",
    CHF: "CHF",
    TRY: "₺",
    UAH: "₴",
    AED: "د.إ",
    GBP: "£",
    VND: "₫",
  };

  return currencySymbols[currencyCode] || "$";
};
