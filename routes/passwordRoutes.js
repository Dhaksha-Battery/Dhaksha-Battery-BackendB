// routes/passwordRoutes.js
import express from "express";
import { forgotPasswordOtp, resetPasswordWithOtp } from "../controllers/passwordController.js";

const router = express.Router();

/**
 * Strongly consider enabling rate-limiting in production.
 * Uncomment and install dependencies if you want to enable.
 *
 * npm i express-rate-limit
 * */
import rateLimit from "express-rate-limit";
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: Number(process.env.OTP_MAX_REQUESTS_PER_HOUR || 5),
  message: "Too many OTP requests from this IP, please try again later",
});

// Request an OTP (forgot password)
router.post(
  "/forgot-password",
  // otpRequestLimiter, // <- enable in production after installing express-rate-limit
  forgotPasswordOtp
);

// Reset password using OTP
router.post("/reset-password", resetPasswordWithOtp);

export default router;