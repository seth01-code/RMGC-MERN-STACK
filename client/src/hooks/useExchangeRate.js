import { useState, useEffect } from "react";
import axios from "axios";

// Country-to-Currency mapping
const countryToCurrencyMap = {
  Nigeria: "NGN",
  "United States": "USD",
  Canada: "CAD",
  UK: "GBP",
  Germany: "EUR",
  France: "EUR",
  Italy: "EUR",
  Spain: "EUR",
  Netherlands: "EUR",
  Belgium: "EUR",
  Austria: "EUR",
  Finland: "EUR",
  Ireland: "EUR",
  Portugal: "EUR",
  Slovakia: "EUR",
  Slovenia: "EUR",
  Cyprus: "EUR",
  Estonia: "EUR",
  Latvia: "EUR",
  Lithuania: "EUR",
  Malta: "EUR",
  India: "INR",
  "South Africa": "ZAR",
  Kenya: "KES",
  Ghana: "GHS",
  Uganda: "UGX",
  Tanzania: "TZS",
  Rwanda: "RWF",
  Malawi: "MWK",
  Zambia: "ZMW",
  Egypt: "EGP",
  Senegal: "XOF",
  Cameroon: "XAF",
  "Côte d'Ivoire": "XOF",
  Ethiopia: "ETB",
  Seychelles: "SCR",
  Mauritius: "MUR",
  Morocco: "MAD",
  Tunisia: "TND",
  Algeria: "DZD",
  Botswana: "BWP",
  Namibia: "NAD",
  Lesotho: "LSL",
  Eswatini: "SZL",
  Mozambique: "MZN",
  Angola: "AOA",
  "Democratic Republic of Congo": "CDF",
  SierraLeone: "SLL",
  Liberia: "LRD",
  Gambia: "GMD",
  Guinea: "GNF",
  BurkinaFaso: "XOF",
  Niger: "XOF",
  Mali: "XOF",
  Togo: "XOF",
  Benin: "XOF",
  Gabon: "XAF",
  "Congo-Brazzaville": "XAF",
  Chad: "XAF",
  "Central African Republic": "XAF",
  "Equatorial Guinea": "XAF",
  "São Tomé and Príncipe": "STN",
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
    USD: "$", // US Dollar (United States)
    CAD: "C$", // Canadian Dollar (Canada)
    GBP: "£", // British Pound (UK)
    EUR: "€", // Euro (Multiple European countries)
    INR: "₹", // Indian Rupee (India)
    NGN: "₦", // Nigerian Naira (Nigeria)
    ZAR: "R", // South African Rand (South Africa)
    KES: "KSh", // Kenyan Shilling (Kenya)
    GHS: "GH₵", // Ghanaian Cedi (Ghana)
    UGX: "USh", // Ugandan Shilling (Uganda)
    TZS: "TSh", // Tanzanian Shilling (Tanzania)
    RWF: "FRw", // Rwandan Franc (Rwanda)
    MWK: "MK", // Malawian Kwacha (Malawi)
    ZMW: "ZK", // Zambian Kwacha (Zambia)
    EGP: "E£", // Egyptian Pound (Egypt)
    XOF: "CFA", // West African CFA Franc (Senegal, Côte d'Ivoire, Burkina Faso, Mali, Niger, Togo, Benin)
    XAF: "FCFA", // Central African CFA Franc (Cameroon, Gabon, Chad, Congo-Brazzaville, Central African Republic, Equatorial Guinea)
    ETB: "Br", // Ethiopian Birr (Ethiopia)
    SCR: "SR", // Seychellois Rupee (Seychelles)
    MUR: "Rs", // Mauritian Rupee (Mauritius)
    MAD: "د.م.", // Moroccan Dirham (Morocco)
    TND: "د.ت", // Tunisian Dinar (Tunisia)
    DZD: "دج", // Algerian Dinar (Algeria)
    BWP: "P", // Botswana Pula (Botswana)
    NAD: "N$", // Namibian Dollar (Namibia)
    LSL: "L", // Lesotho Loti (Lesotho)
    SZL: "E", // Eswatini Lilangeni (Eswatini)
    MZN: "MT", // Mozambican Metical (Mozambique)
    AOA: "Kz", // Angolan Kwanza (Angola)
    CDF: "FC", // Congolese Franc (Democratic Republic of Congo)
    SLL: "Le", // Sierra Leonean Leone (Sierra Leone)
    LRD: "L$", // Liberian Dollar (Liberia)
    GMD: "D", // Gambian Dalasi (Gambia)
    GNF: "FG", // Guinean Franc (Guinea)
    STN: "Db", // São Tomé and Príncipe Dobra (São Tomé and Príncipe)
  };

  return currencySymbols[currencyCode] || "$";
};
