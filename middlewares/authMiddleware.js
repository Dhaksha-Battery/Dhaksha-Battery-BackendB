// middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

/**
 * authMiddleware - verifies Bearer token in Authorization header and attaches payload to req.user
 *
 * Usage:
 *   import { authMiddleware, authAdmin } from "../middlewares/authMiddleware.js";
 *   router.get("/private", authMiddleware, handler);
 */
export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const secret =
      process.env.JWT_SECRET ||
      process.env.JWT_SECRET_KEY ||
      process.env.JWT_KEY;

    if (!secret) {
      console.error("JWT secret not set in env");
      return res.status(500).json({ message: "Server misconfigured (JWT secret)" });
    }

    // verify token (sync verify is fine here)
    const payload = jwt.verify(token, secret);

    // Attach payload to req.user so later handlers can read role/id
    req.user = payload;
    return next();
  } catch (err) {
    // jwt.verify throws on invalid/expired tokens
    console.error("authMiddleware error:", err && err.message ? err.message : err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * authAdmin - requires authenticated user with role === "admin"
 *
 * If req.user is missing, it will run authMiddleware first (to authenticate),
 * then verify role.
 */
export function authAdmin(req, res, next) {
  // If user is not yet authenticated, run authMiddleware first.
  if (!req.user) {
    return authMiddleware(req, res, () => {
      if (req.user && req.user.role === "admin") return next();
      return res.status(403).json({ message: "Admins only" });
    });
  }

  // If req.user exists, just check the role
  if (req.user.role === "admin") return next();
  return res.status(403).json({ message: "Admins only" });
}