// middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

/**
 * protect - verifies Bearer token in Authorization header and attaches payload to req.user
 */
export function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || process.env.JWT_KEY;
    if (!secret) {
      console.error("JWT secret not set in env");
      return res.status(500).json({ message: "Server misconfigured (JWT secret)" });
    }

    const payload = jwt.verify(token, secret);
    req.user = payload; // payload should include { id, role, ... } when token was generated
    return next();
  } catch (err) {
    console.error("protect middleware error:", err && err.message ? err.message : err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * authAdmin - requires authenticated user with role === "admin"
 * This relies on protect having set req.user; if not present it will run protect first.
 */
export function authAdmin(req, res, next) {
  // If request not authenticated yet, run protect first then check role
  if (!req.user) {
    return protect(req, res, () => {
      // after protect completes, req.user should be set
      if (req.user && req.user.role === "admin") return next();
      return res.status(403).json({ message: "Admins only" });
    });
  }

  if (req.user.role === "admin") return next();
  return res.status(403).json({ message: "Admins only" });
}