import jwt from "jsonwebtoken";
import createError from "../utils/createError.js";

/* ================================
   🔐 MAIN TOKEN VERIFICATION
================================ */
export const verifyToken = (req, res, next) => {
  const token =
    req.cookies.accessToken || req.headers.authorization?.split(" ")[1];
  if (!token) return next(createError(401, "You are not authenticated"));

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) return next(createError(403, "Token is not valid"));
    req.user = { ...payload };
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

export const verifyRemoteWorker = (req, res, next) => {
  if (!req.user) return next(createError(401, "Not authenticated"));

  // Check if the user is a remote worker
  if (req.user.role !== "remote_worker" && !req.user.isRemoteWorker) {
    return next(
      createError(403, "Only remote workers can perform this action")
    );
  }

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

export const verifySeller = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized - No user found" });
  }

  if (!req.user.isSeller) {
    return res.status(403).json({ message: "Access denied - Not a seller" });
  }

  next();
};

export const verifySellerOrOrganization = (req, res, next) => {
  if (!req.user) return next(createError(401, "Not authenticated"));

  const isSeller = req.user.role === "seller" || req.user.isSeller;
  const isOrg = req.user.role === "organization";

  if (!isSeller && !isOrg)
    return next(
      createError(
        403,
        "Access denied. Only sellers or organizations can perform this action"
      )
    );

  next();
};
