// utils/getCurrencySymbol.js
export const getCurrencySymbol = (currencyCode) => {
    const symbols = {
      "NGN": "₦", // Naira
      "EUR": "€", // Euro
      "GBP": "£", // Pound
      "USD": "$", // Dollar
      // Add other symbols as needed
    };
  
    return symbols[currencyCode] || "$";  // Default to Dollar if no symbol is found
  };
  