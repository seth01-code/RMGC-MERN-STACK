import Gig from "../models/gigModel.js";
import Order from "../models/orderModel.js";
import Review from "../models/reviewModel.js";
import createError from "../utils/createError.js";

export const createGig = async (req, res, next) => {
  console.log("Incoming request body:", req.body);
  console.log("User from token:", req.user); // Debugging step

  if (!req.user.isSeller) {
    return next(createError(403, "Only sellers can create a gig"));
  }

  const newGig = new Gig({
    userId: req.user.id, // ✅ Uses req.user.id instead of req.userId
    ...req.body,
  });

  try {
    const savedGig = await newGig.save();
    res.status(201).json(savedGig);
  } catch (err) {
    console.error("Error creating gig:", err);
    next(err);
  }
};

export const deleteGig = async (req, res, next) => {
  try {
    // Find the gig by ID
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return next(createError(404, "Gig not found"));
    }

    // Check if the current user is the owner of the gig
    if (gig.userId !== req.user.id) {
      return next(createError(403, "You can only delete your Gig"));
    }

    // Delete related reviews, comments, or orders that reference the gig
    await Review.deleteMany({ gigId: req.params.id });
    // await Comment.deleteMany({ gigId: req.params.id });
    await Order.deleteMany({ gigId: req.params.id });

    // Delete the gig itself
    await Gig.findByIdAndDelete(req.params.id);

    // Send success response
    res.status(200).send("Gig and related data have been deleted");
  } catch (err) {
    next(err);
  }
};

export const getGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) next(createError(404, "Gig not found"));
    res.status(200).send(gig);
  } catch (err) {
    next(err);
  }
};

export const getGigs = async (req, res, next) => {
  const {
    userId,
    cat,
    min,
    max,
    search,
    sort = "createdAt",
    order = "desc",
    userCurrency, // Add user currency as a parameter
    exchangeRate, // Add exchange rate to convert prices
  } = req.query;

  // Convert min and max to user's local currency if exchange rate is provided
  let minConverted = min;
  let maxConverted = max;

  if (exchangeRate) {
    minConverted = min ? Number(min) * Number(exchangeRate) : null;
    maxConverted = max ? Number(max) * Number(exchangeRate) : null;
  }

  const filters = {
    ...(userId && { userId }),
    ...(cat && { cat: { $regex: cat, $options: "i" } }), // Make category case-insensitive
    ...(minConverted || maxConverted
      ? {
          price: {
            ...(minConverted && { $gte: minConverted }),
            ...(maxConverted && { $lte: maxConverted }),
          },
        }
      : {}),
    ...(search && {
      $or: [
        { cat: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ],
    }),
  };

  const sortOrder = order === "asc" ? 1 : -1; // Ascending or descending
  const sortField = sort || "createdAt"; // Default to "createdAt" if not specified

  try {
    const gigs = await Gig.find(filters).sort({ [sortField]: sortOrder });
    res.status(200).json(gigs);
  } catch (err) {
    next(err); // Properly pass the error to middleware
  }
};

export const getGigWithSales = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return next(createError(404, "Gig not found"));
    }

    // Count the total orders for this gig
    const salesCount = await Order.countDocuments({ gigId: gig._id });

    // Send gig details with calculated sales
    res.status(200).json({ ...gig.toObject(), sales: salesCount });
  } catch (err) {
    next(createError(500, "Error fetching gig"));
  }
};

// Get all gigs of a seller, including sales data
export const getGigsWithSales = async (req, res, next) => {
  try {
    const gigs = await Gig.find({ userId: req.userId });

    const gigsWithSales = await Promise.all(
      gigs.map(async (gig) => {
        const salesCount = await Order.countDocuments({ gigId: gig._id });
        return { ...gig.toObject(), sales: salesCount };
      })
    );

    res.status(200).json(gigsWithSales);
  } catch (err) {
    next(createError(500, "Error fetching gigs"));
  }
};
