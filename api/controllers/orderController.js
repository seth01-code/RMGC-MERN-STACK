import createError from "../utils/createError.js";
import Order from "../models/orderModel.js";
import Gig from "../models/gigModel.js";
import Work from "../models/WorkModel.js";
import axios from "axios";
import User from "../models/userModel.js";
import moment from "moment";
import crypto from "crypto";

// ── Payment gateway routing rules ─────────────────────────────────────────────
const PAYSTACK_COUNTRIES = ["Nigeria", "USA"];
const FLUTTERWAVE_BLOCKED = ["Nigeria"];

// Country → currency map (Flutterwave)
const COUNTRY_TO_CURRENCY_FLW = {
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

const getExchangeRate = async (fromCurrency, toCurrency) => {
  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
    );
    return response.data.rates[toCurrency] || null;
  } catch (error) {
    console.error("❌ Error fetching exchange rate:", error);
    return null;
  }
};

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

const bookWorkPayment = async ({ work, proposal, buyerId, reference }) => {
  if (work.paymentStatus === "paid") return null;

  const newOrder = new Order({
    workId: work._id,
    title: work.title,
    img: work.attachmentUrls?.[0] || "",
    buyerId,
    sellerId: proposal.freelancerId,
    price: proposal.bidAmount, // always USD
    currency: "USD",
    payment_intent: reference,
    isCompleted: false,
  });

  await newOrder.save();

  work.paymentStatus = "paid";
  work.paidAt = new Date();
  await work.save();

  return newOrder;
};

// ── Paystack Intent (gig) ─────────────────────────────────────────────────────
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

    if (!PAYSTACK_COUNTRIES.includes(user.country))
      return next(
        createError(400, "Paystack is only available for Nigeria and USA"),
      );

    const countryToCurrency = { USA: "USD", Nigeria: "NGN" };
    const buyerCurrency = countryToCurrency[user.country] || "USD";

    // Convert for checkout display only — gig.price (USD) is stashed in metadata
    let convertedPrice = gig.price;
    if (buyerCurrency !== "USD") {
      const exchangeRate = await getExchangeRate("USD", buyerCurrency);
      convertedPrice = exchangeRate
        ? parseFloat((gig.price * exchangeRate).toFixed(2))
        : gig.price;
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        amount: Math.round(convertedPrice * 100),
        email: user.email,
        currency: buyerCurrency,
        callback_url: `http://localhost:3000/payment-processing`,
        metadata: {
          gigId: gig._id,
          buyerId: userId,
          sellerId: gig.userId,
          price: gig.price, // always USD — used directly in verify
          currency: buyerCurrency,
          gigTitle: gig.title,
          gigCover: gig.cover,
          custom_fields: [
            { display_name: "Gig Title", value: gig.title },
            {
              display_name: "Client Username",
              value: user.username || "No Name",
            },
            { display_name: "Client Email", value: user.email || "No Email" },
            {
              display_name: "Client Phone",
              value: user.phone || "No Phone Number",
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`,
        },
      },
    );

    if (!response.data?.data?.authorization_url)
      return next(createError(500, "Failed to generate payment link"));

    res.status(200).send({ paymentLink: response.data.data.authorization_url });
  } catch (err) {
    console.error("intent error:", err);
    next(createError(500, "Error creating payment intent"));
  }
};

// ── Paystack Intent (job booking) ─────────────────────────────────────────────
export const workIntent = async (req, res, next) => {
  try {
    const workId = req.params.id;
    if (!workId) return next(createError(400, "Job ID is missing"));

    const work = await Work.findById(workId);
    if (!work) return next(createError(404, "Job post not found"));

    const userId = req.user?.id;
    if (!userId) return next(createError(401, "User not authenticated"));

    if (work.clientId.toString() !== userId)
      return next(
        createError(403, "Only the client who posted this job can pay for it."),
      );

    if (!work.acceptedProposalId)
      return next(
        createError(400, "Accept a proposal before paying for this job."),
      );

    if (work.paymentStatus === "paid")
      return next(createError(400, "This job has already been paid for."));

    const proposal = work.proposals.id(work.acceptedProposalId);
    if (!proposal)
      return next(createError(404, "Accepted proposal not found."));

    const user = await User.findById(userId);
    if (!user || !user.email || !user.country)
      return next(createError(400, "User details are incomplete"));

    if (!PAYSTACK_COUNTRIES.includes(user.country))
      return next(
        createError(400, "Paystack is only available for Nigeria and USA"),
      );

    const countryToCurrency = { USA: "USD", Nigeria: "NGN" };
    const buyerCurrency = countryToCurrency[user.country] || "USD";

    let convertedPrice = proposal.bidAmount;
    if (buyerCurrency !== "USD") {
      const exchangeRate = await getExchangeRate("USD", buyerCurrency);
      convertedPrice = exchangeRate
        ? parseFloat((proposal.bidAmount * exchangeRate).toFixed(2))
        : proposal.bidAmount;
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        amount: Math.round(convertedPrice * 100),
        email: user.email,
        currency: buyerCurrency,
        callback_url: `http://localhost:3000/payment-processing`,
        metadata: {
          workId: work._id,
          proposalId: proposal._id,
          buyerId: userId,
          sellerId: proposal.freelancerId,
          price: proposal.bidAmount, // always USD
          currency: buyerCurrency,
          workTitle: work.title,
          custom_fields: [
            { display_name: "Job Title", value: work.title },
            {
              display_name: "Client Username",
              value: user.username || "No Name",
            },
            { display_name: "Client Email", value: user.email || "No Email" },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`,
        },
      },
    );

    if (!response.data?.data?.authorization_url)
      return next(createError(500, "Failed to generate payment link"));

    res.status(200).send({ paymentLink: response.data.data.authorization_url });
  } catch (err) {
    console.error("workIntent error:", err);
    next(createError(500, "Error creating payment intent"));
  }
};

export const paystackWebhook = async (req, res, next) => {
  try {
    const paystackSecret = process.env.PAYSTACK_TEST_SECRET_KEY;
    const hash = crypto
      .createHmac("sha512", paystackSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"])
      return res.status(400).send("Invalid signature");

    const event = req.body;
    if (event.event === "charge.success") {
      const { metadata, status, reference } = event.data;
      if (status !== "success") return res.sendStatus(400);

      if (metadata?.workId) {
        const work = await Work.findById(metadata.workId);
        if (!work) return res.status(400).send("Job post not found");

        if (!work.acceptedProposalId)
          return res.status(400).send("No accepted proposal on this job");

        const proposal = work.proposals.id(work.acceptedProposalId);
        if (!proposal)
          return res.status(400).send("Accepted proposal not found");

        await bookWorkPayment({
          work,
          proposal,
          buyerId: metadata.buyerId,
          reference,
        });
        return res.sendStatus(200);
      }

      const { gigId, buyerId, sellerId, price, gigTitle, gigCover } = metadata;

      const gig = await Gig.findById(gigId);
      if (!gig) return res.status(400).send("Gig not found");

      const newOrder = new Order({
        gigId,
        img: gigCover,
        title: gigTitle,
        buyerId,
        sellerId,
        price, // already USD — stashed at intent time
        currency: "USD",
        payment_intent: reference,
        isCompleted: false,
      });

      await newOrder.save();
      await Gig.findByIdAndUpdate(gigId, { $inc: { sales: 1 } });
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

// ── Flutterwave Intent (gig) ──────────────────────────────────────────────────
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

    if (FLUTTERWAVE_BLOCKED.includes(user.country))
      return next(
        createError(400, "Please use Paystack to complete your payment"),
      );

    const buyerCurrency = COUNTRY_TO_CURRENCY_FLW[user.country] || "USD";

    // Convert for checkout display only — gig.price (USD) is stashed in meta
    let convertedPrice = gig.price;
    if (buyerCurrency !== "USD") {
      const exchangeRate = await getExchangeRate("USD", buyerCurrency);
      convertedPrice = exchangeRate
        ? parseFloat((gig.price * exchangeRate).toFixed(2))
        : gig.price;
    }

    const transactionReference = `txn_gig_${gigId}_${userId}_${Date.now()}`;

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: transactionReference,
        amount: convertedPrice, // local currency for checkout display
        currency: buyerCurrency,
        redirect_url: `http://localhost:3000/payment-processing?tx_ref=${transactionReference}`,
        customer: { email: user.email },
        customizations: {
          title: gig.title,
          description: "Payment for gig",
          logo: gig.cover,
        },
        meta: {
          gigId: gigId,
          buyerId: userId,
          sellerId: gig.userId.toString(),
          gigPriceUSD: gig.price, // always USD — used directly in verify
          gigTitle: gig.title,
          gigCover: gig.cover,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      },
    );

    if (!response.data?.data?.link)
      return next(createError(500, "Failed to generate payment link"));

    res.status(200).send({
      paymentLink: response.data.data.link,
      transactionReference,
    });
  } catch (err) {
    next(createError(500, "Error creating payment intent"));
  }
};

// ── Flutterwave Intent (job booking) ─────────────────────────────────────────
export const workFlutterWaveIntent = async (req, res, next) => {
  try {
    const workId = req.params.id;
    if (!workId) return next(createError(400, "Job ID is missing"));

    const work = await Work.findById(workId);
    if (!work) return next(createError(404, "Job post not found"));

    const userId = req.user?.id;
    if (!userId) return next(createError(401, "User not authenticated"));

    if (work.clientId.toString() !== userId)
      return next(
        createError(403, "Only the client who posted this job can pay for it."),
      );

    if (!work.acceptedProposalId)
      return next(
        createError(400, "Accept a proposal before paying for this job."),
      );

    if (work.paymentStatus === "paid")
      return next(createError(400, "This job has already been paid for."));

    const proposal = work.proposals.id(work.acceptedProposalId);
    if (!proposal)
      return next(createError(404, "Accepted proposal not found."));

    const user = await User.findById(userId);
    if (!user || !user.email || !user.country)
      return next(createError(400, "User details are incomplete"));

    if (FLUTTERWAVE_BLOCKED.includes(user.country))
      return next(
        createError(400, "Please use Paystack to complete your payment"),
      );

    const buyerCurrency = COUNTRY_TO_CURRENCY_FLW[user.country] || "USD";

    let convertedPrice = proposal.bidAmount;
    if (buyerCurrency !== "USD") {
      const exchangeRate = await getExchangeRate("USD", buyerCurrency);
      convertedPrice = exchangeRate
        ? parseFloat((proposal.bidAmount * exchangeRate).toFixed(2))
        : proposal.bidAmount;
    }

    const transactionReference = `txn_work_${workId}_${proposal._id}_${userId}_${Date.now()}`;

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: transactionReference,
        amount: convertedPrice, // local currency for checkout display
        currency: buyerCurrency,
        redirect_url: `http://localhost:3000/payment-processing?tx_ref=${transactionReference}`,
        customer: { email: user.email },
        customizations: {
          title: work.title,
          description: "Payment for job booking",
        },
        meta: {
          workId: work._id.toString(),
          proposalId: proposal._id.toString(),
          buyerId: userId,
          bidAmountUSD: proposal.bidAmount, // always USD — used directly in verify
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      },
    );

    if (!response.data?.data?.link)
      return next(createError(500, "Failed to generate payment link"));

    res.status(200).send({
      paymentLink: response.data.data.link,
      transactionReference,
    });
  } catch (err) {
    next(
      createError(
        500,
        err.response?.data?.message || "Error creating payment intent",
      ),
    );
  }
};

export const verifyPaystackPayment = async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) return next(createError(400, "Reference is missing"));

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET_KEY}`,
        },
      },
    );

    const transaction = response.data?.data;
    if (!transaction || transaction.status !== "success")
      return next(createError(400, "Paystack payment verification failed"));

    const { metadata, reference: ref } = transaction;

    if (metadata?.workId) {
      const existingOrder = await Order.findOne({ payment_intent: ref });
      if (existingOrder)
        return res.status(200).send({ message: "Order already exists" });

      const work = await Work.findById(metadata.workId);
      if (!work) return next(createError(404, "Job post not found"));

      if (!work.acceptedProposalId)
        return next(createError(400, "No accepted proposal on this job"));

      const proposal = work.proposals.id(work.acceptedProposalId);
      if (!proposal)
        return next(createError(404, "Accepted proposal not found"));

      const order = await bookWorkPayment({
        work,
        proposal,
        buyerId: metadata.buyerId,
        reference: ref,
      });

      if (!order)
        return res.status(200).send({ message: "Job already booked" });

      const seller = await User.findById(proposal.freelancerId);
      const buyer = await User.findById(metadata.buyerId);

      return res.status(200).send({
        message: "Payment verified, job booked successfully",
        transactionReference: ref,
        workTitle: work.title,
        amountPaid: proposal.bidAmount,
        currency: "USD",
        buyerUsername: buyer?.username,
        buyerEmail: buyer?.email,
        sellerUsername: seller?.username,
        sellerEmail: seller?.email,
      });
    }

    // price in metadata is gig.price (USD) — use directly, no conversion
    const { gigId, buyerId, sellerId, price, gigTitle, gigCover } = metadata;

    const gig = await Gig.findById(gigId);
    if (!gig) return next(createError(404, "Gig not found"));

    const existingOrder = await Order.findOne({ payment_intent: ref });
    if (existingOrder)
      return res.status(200).send({ message: "Order already exists" });

    const newOrder = new Order({
      gigId,
      img: gigCover,
      title: gigTitle,
      buyerId,
      sellerId,
      price, // already USD
      currency: "USD",
      payment_intent: ref,
      isCompleted: false,
    });

    await newOrder.save();
    await Gig.findByIdAndUpdate(gigId, { $inc: { sales: 1 } });
    await calculateSalesRevenue(gigId);

    const buyer = await User.findById(buyerId);
    const seller = await User.findById(sellerId);

    res.status(200).send({
      message: "Payment verified, order created successfully",
      transactionReference: ref,
      gigTitle,
      amountPaid: price,
      currency: "USD",
      buyerUsername: buyer?.username,
      buyerEmail: buyer?.email,
      sellerUsername: seller?.username,
      sellerEmail: seller?.email,
    });
  } catch (err) {
    console.error("Paystack verification error:", err);
    next(createError(500, "Error verifying Paystack payment"));
  }
};

export const verifyFlutterWavePayment = async (req, res, next) => {
  try {
    const { transaction_id } = req.query;

    if (!transaction_id)
      return next(createError(400, "Transaction ID is missing"));

    const isNumericId = /^\d+$/.test(transaction_id);

    let response;
    try {
      if (isNumericId) {
        response = await axios.get(
          `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
          {
            headers: {
              Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            },
          },
        );
      } else {
        response = await axios.get(
          `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${transaction_id}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
            },
          },
        );
      }
    } catch (flwErr) {
      return next(
        createError(500, "Error contacting Flutterwave for verification"),
      );
    }

    const transaction = response.data?.data;
    if (!transaction || transaction.status !== "successful") {
      return next(createError(400, "Payment verification failed"));
    }

    const { tx_ref, meta } = transaction;

    // ── Recover identifiers ──────────────────────────────────────────────────
    let metaData = {};

    if (meta?.workId || meta?.gigId) {
      metaData = {
        workId: meta.workId,
        proposalId: meta.proposalId,
        gigId: meta.gigId,
        buyerId: meta.buyerId,
        gigPriceUSD: meta.gigPriceUSD,
        bidAmountUSD: meta.bidAmountUSD,
      };
    } else if (tx_ref?.startsWith("txn_work_")) {
      const parts = tx_ref.split("_");
      metaData = {
        workId: parts[2],
        proposalId: parts[3],
        buyerId: parts[4],
      };
    } else if (tx_ref?.startsWith("txn_gig_")) {
      const parts = tx_ref.split("_");
      metaData = {
        gigId: parts[2],
        buyerId: parts[3],
      };
    }

    // ── Work order flow ──────────────────────────────────────────────────────
    if (metaData?.workId) {
      const existingOrder = await Order.findOne({
        payment_intent: transaction_id,
      });
      if (existingOrder)
        return res.status(200).send({ message: "Order already exists" });

      const buyer = await User.findById(metaData.buyerId);
      if (!buyer) return next(createError(400, "Buyer not found"));

      const work = await Work.findById(metaData.workId);
      if (!work) return next(createError(404, "Job post not found"));

      if (!work.acceptedProposalId)
        return next(createError(400, "No accepted proposal on this job"));

      const proposal = work.proposals.id(work.acceptedProposalId);
      if (!proposal)
        return next(createError(404, "Accepted proposal not found"));

      // bidAmountUSD stashed at intent time — always USD
      const bidAmountUSD = metaData.bidAmountUSD ?? proposal.bidAmount;

      const order = await bookWorkPayment({
        work,
        proposal,
        buyerId: buyer.id,
        reference: transaction_id,
      });

      if (!order)
        return res.status(200).send({ message: "Job already booked" });

      const seller = await User.findById(proposal.freelancerId);

      return res.status(200).send({
        message: "Payment verified, job booked successfully",
        transactionReference: transaction_id,
        workTitle: work.title,
        amountPaid: bidAmountUSD,
        currency: "USD",
        buyerUsername: buyer.username,
        buyerEmail: buyer.email,
        sellerUsername: seller?.username,
        sellerEmail: seller?.email,
      });
    }

    // ── Gig order flow ───────────────────────────────────────────────────────
    if (!metaData?.gigId) {
      return next(
        createError(400, "Gig ID is missing in transaction reference"),
      );
    }

    const gigId = metaData.gigId;
    const buyerId = metaData.buyerId;
    const sellerId = meta?.sellerId;
    const gigTitle = meta?.gigTitle;
    const gigCover = meta?.gigCover;

    const gig = await Gig.findById(gigId);
    if (!gig) return next(createError(404, "Gig not found"));

    const existingOrder = await Order.findOne({
      payment_intent: transaction_id,
    });
    if (existingOrder)
      return res.status(200).send({ message: "Order already exists" });

    // gigPriceUSD stashed at intent time — always USD, no conversion needed
    const priceInUSD = metaData.gigPriceUSD ?? gig.price;

    const newOrder = new Order({
      gigId: gig._id,
      img: gigCover ?? gig.cover,
      title: gigTitle ?? gig.title,
      buyerId: buyerId,
      sellerId: sellerId ?? gig.userId,
      price: priceInUSD,
      currency: "USD",
      payment_intent: transaction_id,
      isCompleted: false,
    });

    await newOrder.save();
    await Gig.findByIdAndUpdate(gig._id, { $inc: { sales: 1 } });
    await calculateSalesRevenue(gig._id);

    const buyer = await User.findById(buyerId);
    const seller = await User.findById(sellerId ?? gig.userId);

    res.status(200).send({
      message: "Payment verified, order created successfully",
      transactionReference: transaction_id,
      gigTitle: gigTitle ?? gig.title,
      amountPaid: priceInUSD,
      currency: "USD",
      buyerUsername: buyer?.username,
      buyerEmail: buyer?.email,
      sellerUsername: seller?.username,
      sellerEmail: seller?.email,
    });
  } catch (err) {
    next(createError(500, "Error verifying payment"));
  }
};

export const verifyPayment = async (req, res, next) => {
  const { transaction_id, tx_ref, reference, trxref } = req.query;

  if (transaction_id || tx_ref) {
    req.query.transaction_id = transaction_id || tx_ref;
    return verifyFlutterWavePayment(req, res, next);
  }

  if (reference || trxref) {
    req.query.reference = reference || trxref;
    return verifyPaystackPayment(req, res, next);
  }

  return next(
    createError(400, "No valid payment reference found in query params"),
  );
};

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

    const sellerCurrency = COUNTRY_TO_CURRENCY_FLW[seller.country] || "NGN";

    let usdToLocal = 1;

    try {
      const ratesRes = await axios.get(
        "https://api.exchangerate-api.com/v4/latest/USD",
      );
      const rates = ratesRes.data.rates;
      usdToLocal = rates[sellerCurrency] || 1;
    } catch (err) {
      console.error("Exchange rate fetch failed, falling back to 1:1", err);
    }

    const gigs = await Gig.find({ userId: sellerId });
    let totalRevenueAllGigs = 0;
    const monthlyEarnings = {};

    const revenueData = await Promise.all(
      gigs.map(async (gig) => {
        const orders = await Order.find({ gigId: gig._id });
        // All order prices are in USD — convert to local for display
        const totalRevenueLocal = orders.reduce(
          (sum, o) => sum + o.price * usdToLocal,
          0,
        );

        orders.forEach((order) => {
          const monthYear = moment(order.createdAt).format("MMMM-YYYY");
          if (!monthlyEarnings[monthYear]) monthlyEarnings[monthYear] = 0;
          monthlyEarnings[monthYear] += order.price * usdToLocal;
        });

        totalRevenueAllGigs += totalRevenueLocal;

        return {
          gigId: gig._id,
          title: gig.title,
          totalSales: orders.length,
          totalRevenue: totalRevenueLocal.toFixed(0),
          formattedRevenue: totalRevenueLocal.toLocaleString(),
          currency: sellerCurrency,
        };
      }),
    );

    const workOrders = await Order.find({
      sellerId: String(sellerId),
      workId: { $exists: true },
    });

    if (workOrders.length > 0) {
      const workRevenueLocal = workOrders.reduce(
        (sum, o) => sum + o.price * usdToLocal,
        0,
      );

      workOrders.forEach((order) => {
        const monthYear = moment(order.createdAt).format("MMMM-YYYY");
        if (!monthlyEarnings[monthYear]) monthlyEarnings[monthYear] = 0;
        monthlyEarnings[monthYear] += order.price * usdToLocal;
      });

      totalRevenueAllGigs += workRevenueLocal;

      revenueData.push({
        gigId: null,
        title: "Job post earnings",
        totalSales: workOrders.length,
        totalRevenue: workRevenueLocal.toFixed(0),
        formattedRevenue: workRevenueLocal.toLocaleString(),
        currency: sellerCurrency,
      });
    }

    const formattedMonthlyEarnings = Object.entries(monthlyEarnings).map(
      ([month, revenue]) => ({
        month,
        totalRevenue: revenue.toFixed(0),
        formattedRevenue: revenue.toLocaleString(),
      }),
    );

    res.status(200).json({
      revenueData,
      totalRevenueAllGigs: totalRevenueAllGigs.toFixed(0),
      monthlyEarnings: formattedMonthlyEarnings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminRevenue = async (req, res) => {
  try {
    const admin = await User.findOne({ isAdmin: true });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const adminCurrency = COUNTRY_TO_CURRENCY_FLW[admin.country] || "NGN";

    let usdToLocal = 1;

    try {
      const ratesRes = await axios.get(
        "https://api.exchangerate-api.com/v4/latest/USD",
      );
      const rates = ratesRes.data.rates;
      usdToLocal = rates[adminCurrency] || 1;
    } catch (err) {
      console.error("Exchange rate fetch failed, falling back to 1:1", err);
    }

    const sellers = await User.find({ isSeller: true });
    const monthlyEarnings = {};

    const revenueData = await Promise.all(
      sellers.map(async (seller) => {
        const gigs = await Gig.find({ userId: seller._id });
        const gigIds = gigs.map((g) => g._id);

        const gigOrders = gigIds.length
          ? await Order.find({ gigId: { $in: gigIds } })
          : [];

        const workOrders = await Order.find({
          sellerId: String(seller._id),
          workId: { $exists: true },
        });

        let totalSellerRevenueLocal = 0;

        // All prices in USD — convert to admin's local currency
        gigOrders.forEach((order) => {
          const converted = order.price * usdToLocal;
          totalSellerRevenueLocal += converted;
          if (order.createdAt) {
            const month = moment(order.createdAt).format("MMMM, YYYY");
            if (!monthlyEarnings[month]) monthlyEarnings[month] = 0;
            monthlyEarnings[month] += converted;
          }
        });

        workOrders.forEach((order) => {
          const converted = order.price * usdToLocal;
          totalSellerRevenueLocal += converted;
          if (order.createdAt) {
            const month = moment(order.createdAt).format("MMMM, YYYY");
            if (!monthlyEarnings[month]) monthlyEarnings[month] = 0;
            monthlyEarnings[month] += converted;
          }
        });

        return {
          sellerId: seller._id,
          sellerName: seller.username,
          totalSellerRevenueConverted: totalSellerRevenueLocal.toFixed(2),
          currency: adminCurrency,
        };
      }),
    );

    const monthlyEarningsFormatted = Object.fromEntries(
      Object.entries(monthlyEarnings).map(([month, amount]) => [
        month,
        (amount * 0.1).toFixed(0),
      ]),
    );

    const totalRevenueAllSellersConverted = revenueData.reduce(
      (acc, s) => acc + parseFloat(s.totalSellerRevenueConverted),
      0,
    );

    res.status(200).json({
      revenueData,
      totalRevenueAllSellersConverted:
        totalRevenueAllSellersConverted.toFixed(0),
      monthlyEarnings: monthlyEarningsFormatted,
      currency: adminCurrency,
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
    }).sort({ createdAt: -1 });
    const sellerOrders = await Order.find({
      sellerId: String(userId),
      isCompleted: true,
    }).sort({ createdAt: -1 });
    res.status(200).json({ buyerOrders, sellerOrders });
  } catch (err) {
    next(createError(500, "Error fetching completed orders"));
  }
};

export const getAllCompletedOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

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
      }),
    );

    res.status(200).json(ordersWithUsernames);
  } catch (err) {
    next(createError(500, "Error fetching orders with statuses"));
  }
};
