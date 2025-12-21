import axios from "axios";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";

// Currency mapping for global support
const countryToCurrency = {
  USA: "USD",
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
  Nigeria: "NGN",
  Kenya: "KES",
  Ghana: "GHS",
  "South Africa": "ZAR",
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
  Togo: "XOF",
  Benin: "XOF",
  Gabon: "XAF",
  "Congo-Brazzaville": "XAF",
  Chad: "XAF",
  "Central African Republic": "XAF",
  "Equatorial Guinea": "XAF",
  "São Tomé and Príncipe": "STN",
};

// 💰 Freelancer registration amount (NGN 5000 + VAT)
const BASE_AMOUNT_NGN = 5000;
const VAT_PERCENT = 7.5; // Example VAT
const TOTAL_AMOUNT_NGN = BASE_AMOUNT_NGN * (1 + VAT_PERCENT / 100);

export const flutterwaveFreelancerIntent = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) return next(createError(400, "Email is required"));

    // Fetch pending user
    const pendingUser = pendingUsers.get(email);
    if (!pendingUser) return next(createError(404, "Pending registration not found"));

    const buyerCurrency = countryToCurrency[pendingUser.country] || "NGN";

    // Convert NGN 5000 + VAT to buyer's currency if necessary
    let amount = TOTAL_AMOUNT_NGN;
    if (buyerCurrency !== "NGN") {
      // Assuming you have a utility to get exchange rates
      const exchangeRate = await getExchangeRate("NGN", buyerCurrency);
      amount = exchangeRate ? (TOTAL_AMOUNT_NGN * exchangeRate).toFixed(2) : TOTAL_AMOUNT_NGN;
    }

    const txRef = `freelancer_${Date.now()}_${email}`;

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: txRef,
        amount,
        currency: buyerCurrency,
        redirect_url: `http://localhost:3000/payment/freelancers/success?tx_ref=${txRef}&email=${email}`,
        customer: { email },
        customizations: {
          title: "Freelancer Registration",
          description: "One-time registration fee for RMGC freelancers",
          logo: "", // Optional: your logo URL
        },
        meta: {
          email,
          purpose: "freelancer_registration",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, // Use test key for now
        },
      }
    );

    if (!response.data?.data?.link)
      return next(createError(500, "Failed to generate payment link"));

    res.status(200).json({
      paymentLink: response.data.data.link,
      transactionReference: txRef,
      amount,
      currency: buyerCurrency,
    });
  } catch (err) {
    console.error(err);
    next(createError(500, "Error creating Flutterwave payment intent"));
  }
};
