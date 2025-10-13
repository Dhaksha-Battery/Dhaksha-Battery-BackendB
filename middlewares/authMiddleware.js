import jwt from "jsonwebtoken";
import User from "../models/user.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

/**
 * Protect Middleware — verifies JWT and attaches user
 */
export async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user in DB (ensure they still exist)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found or removed" });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Admin-only Middleware
 */
export function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  next();
}