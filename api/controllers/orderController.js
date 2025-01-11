import axios from "axios";
import Gig from "../models/gigModel.js";
import Order from "../models/orderModel.js";
import createError from "../utils/createError.js";

export const intent = async (req, res, next) => {
  const { userId } = req.user;
  console.log("Authenticated user:", req.user);

  const gig = await Gig.findById(req.params.id);
  if (!gig) {
    console.error("Gig not found with ID:", req.params.id);
    return next(createError(404, "Gig not found"));
  }
  console.log("Found gig:", gig);

  try {
    if (!userId) {
      return next(createError(400, "User is not authenticated"));
    }

    // Log the payment data being sent to Flutterwave
    const paymentData = {
      tx_ref: `txn_${Date.now()}`,
      amount: gig.price,
      currency: "USD",
      redirect_url: "http://localhost:3000/payment-success",
      customer: {
        email: req.user.email,
      },
      customizations: {
        title: gig.title,
        description: "Payment for gig",
        logo: gig.cover,
      },
    };

    console.log("Payment request data:", paymentData);

    // Call Flutterwave API
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    console.log("Flutterwave response:", response.data);

    const newOrder = new Order({
      gigId: gig._id,
      img: gig.cover,
      title: gig.title,
      buyerId: userId,
      sellerId: gig.userId,
      price: gig.price,
      payment_intent: response.data.data.id,
    });

    await newOrder.save();

    res.status(200).send({
      paymentLink: response.data.data.link,
    });
  } catch (err) {
    console.error("Error creating payment intent:", err.response?.data || err.message);
    next(createError(500, "Payment initiation failed"));
  }
};









// export const createOrder = async (req, res, next) => {
//   try {
//     // Log the gig ID for debugging
//     console.log("Received Gig ID:", req.params.id);

//     const gigId = req.params.id;

//     // Validate if gig ID is provided in the request
//     if (!gigId) {
//       return next(createError(400, "Gig ID is required"));
//     }

//     // Fetch the gig from the database
//     const gig = await Gig.findById(gigId);

//     // Check if the gig exists
//     if (!gig) {
//       return next(createError(404, "Gig not found"));
//     }

//     // Create a new order
//     const newOrder = new Order({
//       gigId: gig._id,
//       img: gig.cover,
//       title: gig.title,
//       buyerId: req.userId, // Assuming `req.userId` is set by authentication middleware
//       sellerId: gig.userId,
//       price: gig.price,
//       isCompleted: false,
//       payment_intent: "temporary", // Placeholder for payment intent
//     });

//     // Save the order to the database
//     await newOrder.save();

//     // Respond with a success message
//     res.status(200).send("Order created successfully");
//   } catch (err) {
//     // Pass the error to the error-handling middleware
//     next(err);
//   }
// };

// Placeholder for getOrder function

export const getOrder = async (req, res, next) => {
  try {
    const orders = await Order.find({
      ...(req.isSeller ? { sellerId: req.userId } : { buyerId: req.userId }),
      isCompleted: true,
    });
    res.status(200).send(orders);
  } catch (err) {
    next(err);
  }
};

export const confirm = async (req, res, next) => {
  try {
    const orders = await Order.findOneAndUpdate(
      {
        payment_intent: req.body.payment_intent,
      },
      {
        $set: {
          isCompleted: true,
        },
      }
    );

    res.status(200).send("Order has been confirmed.");
  } catch (err) {
    next(err);
  }
};
