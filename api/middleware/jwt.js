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
      isOrganization: payload.isOrganization || false,
      isRemoteWorker: payload.isRemoteWorker || false,
      role: payload.role || null,
    };

    console.log("👤 User Set in Request:", req.user);
    next();
  });
};

export const verifyTokenOptional = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    console.warn("⚠️ No token found. Proceeding as guest.");
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) {
      console.warn("⚠️ Invalid token. Proceeding as guest.");
      req.user = null;
      return next();
    }

    req.user = {
      id: payload.id,
      isSeller: payload.isSeller || false,
      isAdmin: payload.isAdmin || false,
      isOrganization: payload.isOrganization || false,
      isRemoteWorker: payload.isRemoteWorker || false,
      role: payload.role || null,
    };

    console.log("✅ Token Verified! User Authenticated:", req.user);
    next();
  });
};

export const verifySeller = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized - No user found" });
  }

  if (!req.user.isSeller) {
    return res.status(403).json({ message: "Access denied - Not a seller" });
  }

  next();
};
