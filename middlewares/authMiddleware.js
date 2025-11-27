import jwt from "jsonwebtoken";

/**
 * Verify Bearer token, attach decoded payload to req.user
 */
export function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const secret =
      process.env.JWT_SECRET ||
      process.env.JWT_SECRET_KEY ||
      process.env.JWT_KEY;

    if (!secret) {
      console.error("❌ Missing JWT secret in environment");
      return res.status(500).json({
        message: "Server config error (missing JWT secret)",
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // contains id + role

    return next();
  } catch (err) {
    console.error("protect() error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Only allow admin role
 */
export function authAdmin(req, res, next) {
  if (!req.user) {
    return protect(req, res, () => {
      if (req.user?.role === "admin") return next();
      return res.status(403).json({ message: "Admins only" });
    });
  }

  if (req.user.role === "admin") return next();

  return res.status(403).json({ message: "Admins only" });
}