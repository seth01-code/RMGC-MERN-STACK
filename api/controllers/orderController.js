import createError from "../utils/createError.js";
import Order from "../models/orderModel.js";
import Gig from "../models/gigModel.js";
import axios from "axios";
import User from "../models/userModel.js";
import moment from "moment"; // Ensure moment.js is installed: npm install moment
import crypto from "crypto";

// Function to get exchange rates
const getExchangeRate = async (fromCurrency, toCurrency) => {
  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );
    return response.data.rates[toCurrency] || null;
  } catch (error) {
    console.error("❌ Error fetching exchange rate:", error);
    return null;
  }
};

// Function to calculate and update sales revenue
const calculateSalesRevenue = async (gigId) => {
  try {
    const gig = await Gig.findById(gigId);
    if (!gig) return null;

    const totalRevenue = gig.sales * gig.price;

    await Gig.findByIdAndUpdate(gigId, { salesRevenue: totalRevenue });

    return totalRevenue;
  } catch (error) {
    console.error("❌ Error calculating sales revenue:", error);
    return null;
  }
};

// Paystack Intent
export const intent = async (req, res, next) => {
  try {
    const gigId = req.params.id;
    if (!gigId) return next(createError(400, "Gig ID is missing"));

    const gig = await Gig.findById(gigId);
    if (!gig) return next(createError(404, "Gig not found"));

    const userId = req.user?.id;
    if (!userId) return next(createError(401, "User not authenticated"));

    const user = await User.findById(userId);
    if (!user || !user.email || !user.country)
      return next(createError(400, "User details are incomplete"));

    // Determine buyer currency (USD or NGN)
    const countryToCurrency = { USA: "USD", Nigeria: "NGN" };
    const buyerCurrency = countryToCurrency[user.country] || "USD";

    if (!["USD", "NGN"].includes(buyerCurrency)) {
      return next(createError(400, "Unsupported currency"));
    }

    let convertedPrice = gig.price;
    if (buyerCurrency !== "USD") {
      const exchangeRate = await getExchangeRate("USD", buyerCurrency);
      convertedPrice = exchangeRate
        ? (gig.price * exchangeRate).toFixed(2)
        : gig.price;
    }

    // Generate Paystack Payment Link
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        amount: convertedPrice * 100, // Convert to kobo/cents
        email: user.email,
        currency: buyerCurrency,
        callback_url: `https://www.renewedmindsglobalconsult.com/payment-processing`,
        metadata: {
          gigId: gig._id,
          buyerId: userId,
          sellerId: gig.userId,
          price: gig.price,
          currency: buyerCurrency,
          gigTitle: gig.title,
          gigCover: gig.cover,
          custom_fields: [
            { display_name: "Gig Title", value: gig.title },
            {
              display_name: "Client Username",
              value: user.username || "No Name",
            },
            {
              display_name: "Client Email",
              value: user.email || "No Email",
            },
            {
              display_name: "Client Phone",
              value: user.phone || "No Phone Number",
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_LIVE_SECRET_KEY}`,
        },
      }
    );

    if (!response.data?.data?.authorization_url)
      return next(createError(500, "Failed to generate payment link"));

    res.status(200).send({ paymentLink: response.data.data.authorization_url });
  } catch (err) {
    console.error("Error details:", err);
    next(createError(500, "Error creating payment intent"));
  }
};

export const paystackWebhook = async (req, res, next) => {
  try {
    const paystackSecret = process.env.PAYSTACK_LIVE_SECRET_KEY;
    const hash = crypto
      .createHmac("sha512", paystackSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    // Verify Paystack signature
    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;
    if (event.event === "charge.success") {
      const { metadata, status, reference } = event.data;
      if (status !== "success") return res.sendStatus(400);

      // Extract metadata
      let { gigId, buyerId, sellerId, price, currency, gigTitle, gigCover } =
        metadata;

      // Ensure gig exists
      const gig = await Gig.findById(gigId);
      if (!gig) return res.status(400).send("Gig not found");

      // Convert price to USD if needed
      let priceInUSD = price;
      if (currency !== "USD") {
        const exchangeRate = await getExchangeRate(currency, "USD");
        priceInUSD = exchangeRate ? (price / exchangeRate).toFixed(2) : price;
      }

      // Create order in database with converted price
      const newOrder = new Order({
        gigId,
        img: gigCover,
        title: gigTitle,
        buyerId,
        sellerId,
        price: priceInUSD, // Store price in USD
        currency: "USD", // Always store orders in USD
        payment_intent: reference, // Store Paystack transaction reference
        isCompleted: false,
      });

      await newOrder.save();

      // Increment gig sales count
      await Gig.findByIdAndUpdate(gigId, { $inc: { sales: 1 } });

      // Update revenue tracking
      await calculateSalesRevenue(gigId);

      res.sendStatus(200);
    } else {
      res.sendStatus(400);
    }
  } catch (err) {
    console.error("Webhook Error:", err);
    next(createError(500, "Error processing payment webhook"));
  }
};

// Flutterwave Intent

export const flutterWaveIntent = async (req, res, next) => {
  try {
    const gigId = req.params.id;
    if (!gigId) return next(createError(400, "Gig ID is missing"));

    const gig = await Gig.findById(gigId);
    if (!gig) return next(createError(404, "Gig not found"));

    const userId = req.user?.id;
    if (!userId) return next(createError(401, "User not authenticated"));

    const user = await User.findById(userId);
    if (!user || !user.email || !user.country)
      return next(createError(400, "User details are incomplete"));

    // Currency mapping
    const countryToCurrency = {
      USA: "USD",
      Canada: "CAD",
      UK: "GBP",
      Germany: "EUR",
      India: "INR",
      Nigeria: "NGN",
      SouthAfrica: "ZAR",
      Kenya: "KES",
      Ghana: "GHS",
      Egypt: "EGP",
    };
    const buyerCurrency = countryToCurrency[user.country] || "USD";
    const sellerCurrency = "USD";

    // Convert price if necessary
    let convertedPrice = gig.price;
    if (buyerCurrency !== sellerCurrency) {
      const exchangeRate = await getExchangeRate(sellerCurrency, buyerCurrency);
      convertedPrice = exchangeRate
        ? (gig.price * exchangeRate).toFixed(2)
        : gig.price;
    }

    const transactionReference = `txn_${Date.now()}_${userId}`;

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: transactionReference,
        amount: convertedPrice,
        currency: buyerCurrency,
        redirect_url: `https://www.renewedmindsglobalconsult.com/payment-processing?tx_ref=${transactionReference}`,
        customer: { email: user.email },
        customizations: {
          title: gig.title,
          description: "Payment for gig",
          logo: gig.cover,
        },
        meta: {
          gigId: gigId, // FIX: Add gigId to metadata
          buyerId: userId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    if (!response.data?.data?.link)
      return next(createError(500, "Failed to generate payment link"));

    res
      .status(200)
      .send({ paymentLink: response.data.data.link, transactionReference });
  } catch (err) {
    next(createError(500, "Error creating payment intent"));
  }
};

export const verifyFlutterWavePayment = async (req, res, next) => {
  try {
    const { transaction_id } = req.query;

    if (!transaction_id) {
      return next(createError(400, "Transaction ID is missing"));
    }

    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const transaction = response.data?.data;
    if (!transaction || transaction.status !== "successful") {
      return next(createError(400, "Payment verification failed"));
    }

    const { amount, currency, customer, meta } = transaction;

    // Ensure metadata exists and contains gigId
    if (!meta?.gigId) {
      return next(createError(400, "Gig ID is missing in transaction metadata"));
    }

    // Fetch the buyer
    const buyer = await User.findOne({ email: customer.email });
    if (!buyer) {
      return next(createError(400, "Buyer not found"));
    }

    // Prevent duplicate orders
    const existingOrder = await Order.findOne({ payment_intent: transaction_id });
    if (existingOrder) {
      return res.status(200).send({ message: "Order already exists" });
    }

    // Fetch gig details
    const gig = await Gig.findById(meta.gigId);
    if (!gig) {
      return next(createError(404, "Gig not found"));
    }

    // Create new order (price remains as sent by Flutterwave)
    const newOrder = new Order({
      gigId: gig._id,
      img: gig.cover,
      title: gig.title,
      buyerId: buyer.id,
      sellerId: gig.userId,
      price: amount, // No conversion, use the amount from Flutterwave
      currency: currency, // Store the currency as received from Flutterwave
      payment_intent: transaction_id,
      isCompleted: true,
    });

    await newOrder.save();

    // Update gig sales
    await Gig.findByIdAndUpdate(gig._id, { $inc: { sales: 1 } });

    // Recalculate seller revenue
    await calculateSalesRevenue(gig._id);

    res.status(200).send({ message: "Payment verified, order created successfully" });
  } catch (err) {
    console.error("Payment verification error:", err);
    next(createError(500, "Error verifying payment"));
  }
};


// Get Orders
export const getOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const buyerOrders = await Order.find({ buyerId: String(userId) }).sort({
      createdAt: -1,
    });
    const sellerOrders = await Order.find({ sellerId: String(userId) }).sort({
      createdAt: -1,
    });

    res.status(200).json({ buyerOrders, sellerOrders });
  } catch (err) {
    next(createError(500, "Error fetching orders"));
  }
};

// Get Sales Revenue
export const getSalesRevenue = async (req, res, next) => {
  try {
    const gigId = req.params.id;

    const gig = await Gig.findById(gigId);
    if (!gig) return next(createError(404, "Gig not found"));

    res.status(200).json({ salesRevenue: gig.salesRevenue });
  } catch (err) {
    next(createError(500, "Error fetching sales revenue"));
  }
};

// Mark Order as Completed
export const completeOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    if (!order) return next(createError(404, "Order not found"));

    order.isCompleted = true;
    await order.save();

    res.status(200).json({ message: "Order marked as completed" });
  } catch (err) {
    next(createError(500, "Error completing order"));
  }
};

// Update Order Status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { isCompleted } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return next(createError(404, "Order not found"));

    order.isCompleted = isCompleted;
    await order.save();

    res.status(200).send({ message: "Order status updated", order });
  } catch (err) {
    next(createError(500, "Error updating order status"));
  }
};

export const getSellerRevenue = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const seller = await User.findById(sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    console.log("Seller Country:", seller.country);

    const countryToCurrency = {
      USA: "USD",
      Nigeria: "NGN",
    };

    const countryToCurrencySymbol = {
      USD: "$",
      NGN: "₦",
    };

    const sellerCurrency = countryToCurrency[seller.country] || "USD";
    const sellerCurrencySymbol = countryToCurrencySymbol[sellerCurrency] || "$";

    const gigs = await Gig.find({ userId: sellerId });

    console.log("Gigs:", gigs);

    let totalRevenueAllGigs = 0;
    let monthlyEarnings = {}; // Store earnings per month

    const revenueData = await Promise.all(
      gigs.map(async (gig) => {
        const orders = await Order.find({ gigId: gig._id });

        let totalSales = orders.length;
        let totalRevenue = orders.reduce((sum, order) => sum + gig.price, 0);

        console.log(
          `Gig Price (USD): ${gig.price}, Total Revenue (USD): ${totalRevenue}`
        );

        let convertedRevenue = totalRevenue;
        let exchangeRate = 1; // Default to 1 for USD

        if (sellerCurrency !== "USD") {
          try {
            exchangeRate = await getExchangeRate("USD", sellerCurrency);
            console.log(`Exchange Rate for ${sellerCurrency}:`, exchangeRate);
            if (exchangeRate) {
              convertedRevenue = totalRevenue * exchangeRate;
            } else {
              console.warn(
                `Exchange rate for ${sellerCurrency} not found, using USD`
              );
            }
          } catch (error) {
            console.error(`Error fetching exchange rate: ${error.message}`);
          }
        }

        // Calculate monthly earnings without accumulation
        orders.forEach((order) => {
          const monthYear = moment(order.createdAt).format("MMMM-YYYY");

          if (!monthlyEarnings[monthYear]) {
            monthlyEarnings[monthYear] = 0;
          }

          monthlyEarnings[monthYear] += gig.price * exchangeRate; // Convert each order price separately
        });

        totalRevenueAllGigs += convertedRevenue;

        return {
          gigId: gig._id,
          title: gig.title,
          totalSales,
          totalRevenue: convertedRevenue.toFixed(0),
          formattedRevenue: `${sellerCurrencySymbol}${convertedRevenue.toLocaleString()}`,
          currency: sellerCurrency,
        };
      })
    );

    // Convert monthly earnings to an array of objects (without accumulation)
    const formattedMonthlyEarnings = Object.entries(monthlyEarnings).map(
      ([month, revenue]) => ({
        month,
        totalRevenue: revenue.toFixed(0),
        formattedRevenue: `${sellerCurrencySymbol}${revenue.toLocaleString()}`,
      })
    );

    // Format total revenue
    const formattedTotalRevenueAllGigs = `${sellerCurrencySymbol}${totalRevenueAllGigs.toLocaleString()}`;

    res.status(200).json({
      revenueData,
      totalRevenueAllGigs: totalRevenueAllGigs.toFixed(0),
      formattedTotalRevenueAllGigs,
      monthlyEarnings: formattedMonthlyEarnings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminRevenue = async (req, res) => {
  try {
    // Fetch the admin user (assuming there's only one admin)
    const admin = await User.findOne({ isAdmin: true });

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    console.log("Admin Country:", admin.country);

    // Mapping countries to their respective currencies
    const countryToCurrency = {
      USA: "USD",
      Nigeria: "NGN",
    };

    const countryToCurrencySymbol = {
      USD: "$",
      NGN: "₦",
    };

    const adminCurrency = countryToCurrency[admin.country] || "USD"; // Default to USD if not found
    const adminCurrencySymbol = countryToCurrencySymbol[adminCurrency] || "$"; // Default to $

    // Get exchange rate if the admin's currency is not USD
    let exchangeRate = 1;
    if (adminCurrency !== "USD") {
      try {
        exchangeRate = await getExchangeRate("USD", adminCurrency);
        console.log(`Exchange Rate (USD to ${adminCurrency}):`, exchangeRate);
      } catch (error) {
        console.error(`Error fetching exchange rate: ${error.message}`);
      }
    }

    // Get all sellers (users with isSeller: true)
    const sellers = await User.find({ isSeller: true });

    const monthlyEarnings = {}; // Store earnings for each month separately

    const revenueData = await Promise.all(
      sellers.map(async (seller) => {
        // Find all gigs for the seller
        const gigs = await Gig.find({ userId: seller._id });

        // Calculate total revenue for the seller (in USD)
        let totalSellerRevenueUSD = 0;

        for (const gig of gigs) {
          const orders = await Order.find({ gigId: gig._id });

          for (const order of orders) {
            if (order.createdAt) {
              const orderMonth = moment(order.createdAt).format("MMMM, YYYY");

              totalSellerRevenueUSD += gig.price;

              // Ensure the month is stored separately
              if (!monthlyEarnings[orderMonth]) {
                monthlyEarnings[orderMonth] = 0; // Initialize if not exists
              }

              monthlyEarnings[orderMonth] += gig.price; // Store earnings for each month separately
            }
          }
        }

        // Convert revenue to admin's currency
        const totalSellerRevenueConverted =
          totalSellerRevenueUSD * exchangeRate;

        return {
          sellerId: seller._id,
          sellerName: seller.username,
          totalSellerRevenueUSD: totalSellerRevenueUSD.toFixed(2), // Revenue in USD
          totalSellerRevenueConverted: totalSellerRevenueConverted.toFixed(2), // Converted revenue
          formattedRevenue: `${adminCurrencySymbol}${totalSellerRevenueConverted.toLocaleString()}`, // Formatted revenue with currency symbol
          currency: adminCurrency, // Admin's currency
        };
      })
    );

    // Convert monthly earnings to admin's currency separately
    const monthlyEarningsConverted = Object.fromEntries(
      Object.entries(monthlyEarnings).map(([month, earnings]) => [
        month,
        (earnings * exchangeRate * 0.1).toFixed(0),
      ])
    );

    // Calculate total revenue for all sellers combined (in USD)
    const totalRevenueAllSellersUSD = revenueData.reduce(
      (acc, seller) => acc + parseFloat(seller.totalSellerRevenueUSD),
      0
    );

    // Convert total revenue to admin's currency
    const totalRevenueAllSellersConverted =
      totalRevenueAllSellersUSD * exchangeRate;

    res.status(200).json({
      revenueData, // Revenue per seller
      totalRevenueAllSellersUSD: totalRevenueAllSellersUSD.toFixed(0), // Total revenue in USD
      totalRevenueAllSellersConverted:
        totalRevenueAllSellersConverted.toFixed(0), // Total revenue converted
      formattedTotalRevenueAllSellers: `${adminCurrencySymbol}${totalRevenueAllSellersConverted.toLocaleString()}`, // Formatted total revenue
      monthlyEarnings: monthlyEarningsConverted, // Monthly earnings (separated by month)
      currency: adminCurrency, // Admin's currency
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin revenue", error });
  }
};

export const getCompletedOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const buyerOrders = await Order.find({
      buyerId: String(userId),
      isCompleted: true,
    }).sort({
      createdAt: -1,
    });
    const sellerOrders = await Order.find({
      sellerId: String(userId),
      isCompleted: true,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({ buyerOrders, sellerOrders });
  } catch (err) {
    next(createError(500, "Error fetching completed orders"));
  }
};

export const getAllCompletedOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    // Fetch seller and buyer details for each order
    const ordersWithUsernames = await Promise.all(
      orders.map(async (order) => {
        const seller = await User.findById(order.sellerId).select("username");
        const buyer = await User.findById(order.buyerId).select("username");

        return {
          ...order._doc,
          sellerName: seller ? seller.username : "No Longer Available",
          buyerName: buyer ? buyer.username : "No Longer Available",
          status: order.isCompleted ? "Completed" : "Pending",
        };
      })
    );

    res.status(200).json(ordersWithUsernames);
  } catch (err) {
    next(createError(500, "Error fetching orders with statuses"));
  }
};
