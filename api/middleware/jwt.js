import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";
import User from "../models/userModel.js";  // Assuming User model is in the models directory

export const verifyToken = async (req, res, next) => {
  const token = req.cookies.accessToken;
  console.log("Token received:", token);  // Log received token

  if (!token) {
    return next(createError(401, "You are not authenticated"));
  }

  jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
    if (err) return next(createError(403, "Token is not valid"));

    try {
      const user = await User.findById(payload.id);
      if (!user) {
        return next(createError(404, "User not found"));
      }

      req.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        isSeller: user.isSeller,
        country: user.country,
        phone: user.phone,
        desc: user.desc,
      };

      console.log("Authenticated user:", req.user);  // Log authenticated user data
      next();
    } catch (err) {
      return next(createError(500, "Server error while fetching user data"));
    }
  });
};

