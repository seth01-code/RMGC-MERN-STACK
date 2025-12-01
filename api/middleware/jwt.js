import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

/* ================================
   🔐 MAIN TOKEN VERIFICATION
================================ */
export const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    console.error("❌ No token in cookies");
    return next(createError(401, "You are not authenticated"));
  }

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) {
      console.error("❌ Invalid Token:", err.message);
      return next(createError(403, "Token is not valid"));
    }

    console.log("✅ Token Verified:", payload);

    req.user = {
      id: payload.id,
      role: payload.role, // organization, freelancer, remoteWorker, admin
      isSeller: payload.isSeller || false,
      isAdmin: payload.isAdmin || false,
      isOrganization: payload.isOrganization || false,
      isRemoteWorker: payload.isRemoteWorker || false,
    };

    next();
  });
};

/* ================================
   🔓 OPTIONAL TOKEN
================================ */
export const verifyTokenOptional = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) {
      req.user = null;
      return next();
    }

    req.user = {
      id: payload.id,
      role: payload.role,
      isSeller: payload.isSeller || false,
      isAdmin: payload.isAdmin || false,
      isOrganization: payload.isOrganization || false,
      isRemoteWorker: payload.isRemoteWorker || false,
    };

    next();
  });
};

/* ================================
   🏢 ORGANIZATION GUARD
   For posting/editing/deleting jobs
================================ */
export const verifyOrganization = (req, res, next) => {
  if (!req.user) return next(createError(401, "Not authenticated"));

  if (req.user.role !== "organization")
    return next(createError(403, "Only organizations can perform this action"));

  next();
};

/* ================================
   🧑‍💼 ADMIN GUARD
================================ */
export const verifyAdmin = (req, res, next) => {
  if (!req.user) return next(createError(401, "Not authenticated"));

  if (!req.user.isAdmin && req.user.role !== "admin")
    return next(createError(403, "Admin access required"));

  next();
};

/* ================================
   👨‍💻 REMOTE WORKER GUARD
   For applying to jobs only
================================ */
export const verifyRemoteWorker = (req, res, next) => {
  if (!req.user) return next(createError(401, "Not authenticated"));

  if (req.user.role !== "remoteWorker")
    return next(createError(403, "Only remote workers can apply for jobs"));

  next();
};

/* ================================
   👤 USER-OR-ADMIN GUARD
   For editing/deleting applications
================================ */
export const verifySelfOrAdmin = (req, res, next) => {
  if (!req.user) return next(createError(401, "Not authenticated"));

  // user must be owner OR admin
  if (req.user.id !== req.params.userId && !req.user.isAdmin) {
    return next(createError(403, "Access denied"));
  }

  next();
};
