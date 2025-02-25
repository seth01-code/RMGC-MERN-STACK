import axios from "axios";

// Example function to fetch exchange rates, you may use your existing converter API
export const getExchangeRate = async (fromCurrency, toCurrency) => {
  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    const exchangeRate = response.data.rates[toCurrency];
    return exchangeRate || 1; // Return the exchange rate or default to 1 if not found
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return 1; // Default to 1 if there's an error
  }
};
