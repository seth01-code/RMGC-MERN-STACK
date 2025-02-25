export const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    req.isAdmin = true; // Add this line to ensure it is accessible in routes
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
};
