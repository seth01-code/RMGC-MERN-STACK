import Gig from "../models/gigModel.js";
import createError from "../utils/createError.js";

export const createGig = async (req, res, next) => {
  console.log("Request body:", req.body); // Log the incoming request body

  if (!req.isSeller)
    return next(createError(403, "Only sellers can create a gig"));

  const newGig = new Gig({
    userId: req.userId, // Ensure this is populated correctly
    ...req.body,
  });

  try {
    const savedGig = await newGig.save();
    res.status(201).json(savedGig);
  } catch (err) {
    console.error("Error creating gig:", err); // Log the error
    next(err);
  }
};

export const deleteGig = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (gig.userId !== req.userId)
      return next(createError(403, "You can only delete Your Gig"));

    await Gig.findByIdAndDelete(req.params.id);
    res.status(200).send("Gig has been deleted");
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
  } = req.query;

  const filters = {
    ...(userId && { userId }),
    ...(cat && { cat: { $regex: cat, $options: "i" } }), // Make category case-insensitive
    ...(min || max
      ? {
          price: {
            ...(min && { $gte: Number(min) }),
            ...(max && { $lte: Number(max) }),
          },
        }
      : {}),
    ...(search && { title: { $regex: search, $options: "i" } }),
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
