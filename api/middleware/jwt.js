import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) {
    console.error("❌ No token found in cookies.");
    return next(createError(401, "You are not authenticated"));
  }

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) {
      console.error("❌ Invalid Token:", err);
      return next(createError(403, "Token is not valid"));
    }

    console.log("✅ Token Verified! Payload:", payload);

    req.user = { 
      id: payload.id, 
      isSeller: payload.isSeller || false, 
      isAdmin: payload.isAdmin || false,
    };

    console.log("👤 User Set in Request:", req.user);
    next();
  });
};









// import User from "../models/userModel.js";

export const verifySeller = (req, res, next) => {
  // console.log("🔍 Checking seller status...", req.user);

  if (!req.user || !req.user.id) {
    // console.log("❌ No user found in request.");
    return res.status(401).json({ message: "Unauthorized - No user found" });
  }

  if (!req.user.isSeller) {
    // console.log("❌ Access Denied - User is not a seller.");
    return res.status(403).json({ message: "Access denied - Not a seller" });
  }

  // console.log("✅ Seller Verified:", req.user);
  next();
};




