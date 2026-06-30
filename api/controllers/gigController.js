import Gig from "../models/gigModel.js";
import Order from "../models/orderModel.js";
import Review from "../models/reviewModel.js";
import User from "../models/userModel.js";           // ← ADD
import createError from "../utils/createError.js";

export const createGig = async (req, res, next) => {
  console.log("Incoming request body:", req.body);
  console.log("User from token:", req.user);

  if (!req.user.isSeller) {
    return next(createError(403, "Only sellers can create a gig"));
  }

  const newGig = new Gig({
    userId: req.user.id,
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
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return next(createError(404, "Gig not found"));
    }

    if (gig.userId !== req.user.id) {
      return next(createError(403, "You can only delete your Gig"));
    }

    await Review.deleteMany({ gigId: req.params.id });
    await Order.deleteMany({ gigId: req.params.id });
    await Gig.findByIdAndDelete(req.params.id);

    res.status(200).send("Gig and related data have been deleted");
  } catch (err) {
    next(err);
  }
};

export const getGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return next(createError(404, "Gig not found"));

    // Hide gig if owner is suspended
    const owner = await User.findById(gig.userId).select("suspended");
    if (!owner || owner.suspended) {
      return next(createError(404, "Gig not found"));
    }

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
    exchangeRate,
  } = req.query;

  let minConverted = min;
  let maxConverted = max;

  if (exchangeRate) {
    minConverted = min ? Number(min) * Number(exchangeRate) : null;
    maxConverted = max ? Number(max) * Number(exchangeRate) : null;
  }

  const filters = {
    ...(userId && { userId }),
    ...(cat && { cat: { $regex: cat, $options: "i" } }),
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

  const sortOrder = order === "asc" ? 1 : -1;
  const sortField = sort || "createdAt";

  try {
    // Get IDs of all suspended users so we can exclude their gigs
    const suspendedUsers = await User.find({ suspended: true }).select("_id");
    const suspendedIds = suspendedUsers.map((u) => u._id);

    const gigs = await Gig.find({
      ...filters,
      userId: {
        ...(filters.userId ? { $eq: filters.userId } : {}),
        $nin: suspendedIds,   // exclude suspended sellers
      },
    }).sort({ [sortField]: sortOrder });

    res.status(200).json(gigs);
  } catch (err) {
    next(err);
  }
};

export const getGigWithSales = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return next(createError(404, "Gig not found"));

    // Hide gig if owner is suspended
    const owner = await User.findById(gig.userId).select("suspended");
    if (!owner || owner.suspended) {
      return next(createError(404, "Gig not found"));
    }

    const salesCount = await Order.countDocuments({ gigId: gig._id });
    res.status(200).json({ ...gig.toObject(), sales: salesCount });
  } catch (err) {
    next(createError(500, "Error fetching gig"));
  }
};

export const getGigsWithSales = async (req, res, next) => {
  try {
    // This is a seller viewing their own gigs — suspension doesn't apply here
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

export const getUserGigs = async (req, res, next) => {
  try {
    // If the seller is suspended, return empty — don't expose their profile
    const owner = await User.findById(req.params.userId).select("suspended");
    if (!owner || owner.suspended) {
      return res.status(200).json([]);
    }

    const gigs = await Gig.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json(gigs);
  } catch (err) {
    next(err);
  }
};