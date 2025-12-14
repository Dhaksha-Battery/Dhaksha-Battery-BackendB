// controllers/passwordController.js
import User from "../models/user.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendMail } from "../config/mailer.js";
import dotenv from "dotenv";
dotenv.config();

const OTP_EXPIRES_MIN = Number(process.env.OTP_EXPIRES_MIN || 15);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);

/**
 * POST /auth/forgot-password
 * Body: { email }
 * Generates numeric OTP, stores SHA256(otp) in user.resetOtpHash with expiry
 * Sends OTP via email (SendGrid).
 */
export async function forgotPasswordOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Respond generically if no user to prevent account enumeration
    const genericMsg =
      "If an account with that email exists, an OTP has been sent.";

    if (!user) {
      return res.json({ message: genericMsg });
    }

    // Optional: simple per-user rate guard via attempts (not a full rate-limit)
    if (user.resetOtpAttempts && user.resetOtpAttempts >= 1000) {
      // extremely unlikely; safety net
      return res.status(429).json({ message: "Too many requests" });
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString(); // 6 digits
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiry = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    // Store hashed OTP & expiry & reset attempts
    user.resetOtpHash = otpHash;
    user.resetOtpExpires = expiry;
    user.resetOtpAttempts = 0;
    await user.save();

    // Compose email
    const subject = "Your password reset code (OTP)";
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.4;color:#111">
        <p>Hello ${user.name || ""},</p>
        <p>Your password reset code is:</p>
        <p style="font-size:22px;letter-spacing:4px;font-weight:700;margin:8px 0">${otp}</p>
        <p>This code will expire in ${OTP_EXPIRES_MIN} minutes. If you did not request this, you can ignore this email.</p>
        <hr style="margin:16px 0" />
        <p style="font-size:12px;color:#666">If you didn't request a password reset, no action is required.</p>
      </div>
    `;
    const text = `Your password reset code is: ${otp}. It will expire in ${OTP_EXPIRES_MIN} minutes.`;

    try {
      await sendMail({ to: user.email, subject, text, html });
    } catch (mailErr) {
      // If email fails, clear stored OTP to avoid orphaned OTPs
      console.warn("forgotPasswordOtp: sendMail failed:", mailErr);
      user.resetOtpHash = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      await user.save().catch(() => {});
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    return res.json({ message: genericMsg });
  } catch (err) {
    console.error("forgotPasswordOtp error:", err);
    return res
      .status(500)
      .json({ message: "Failed to process forgot password" });
  }
}

/**
 * POST /auth/reset-password
 * Body: { email, otp, newPassword }
 * Validates OTP (hash compare + expiry + attempt limit) and updates password.
 */
export async function resetPasswordWithOtp(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email, otp and new password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid OTP or email" });
    }

    if (!user.resetOtpHash || !user.resetOtpExpires) {
      return res
        .status(400)
        .json({ message: "No OTP requested or OTP expired" });
    }

    // Check expiry
    if (new Date() > user.resetOtpExpires) {
      // clear fields
      user.resetOtpHash = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      await user.save().catch(() => {});
      return res.status(400).json({ message: "OTP expired" });
    }

    // Check attempts limit
    if (user.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      user.resetOtpHash = null;
      user.resetOtpExpires = null;
      user.resetOtpAttempts = 0;
      await user.save().catch(() => {});
      return res
        .status(429)
        .json({
          message: "Too many incorrect OTP attempts. Request a new code.",
        });
    }

    // Validate OTP by hashing and comparing
    const providedHash = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");
    if (providedHash !== user.resetOtpHash) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save().catch(() => {});
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // NEW: Prevent new password being same as previous password
    try {
      const isSame = await bcrypt.compare(newPassword, user.password);
      if (isSame) {
        return res
          .status(400)
          .json({
            message:
              "New password cannot be the same as the previous password.",
          });
      }
    } catch (cmpErr) {
      console.warn("resetPasswordWithOtp: bcrypt.compare failed:", cmpErr);
      // proceed — hashing will catch issues but return generic error if something else fails
    }

    // OTP valid — hash new password and save
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear OTP fields
    user.resetOtpHash = null;
    user.resetOtpExpires = null;
    user.resetOtpAttempts = 0;

    await user.save();

    // Send confirmation email (best practice) - best effort
    try {
      const subject = "Your password has been changed";
      const html = `<p>Hello ${
        user.name || ""
      },</p><p>Your password was changed successfully. If you did not perform this action, contact support immediately.</p>`;
      const text = "Your password was changed successfully.";
      await sendMail({ to: user.email, subject, text, html });
    } catch (mailErr) {
      console.warn("resetPasswordWithOtp: confirmation email failed:", mailErr);
      // continue without failing the request
    }

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("resetPasswordWithOtp error:", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
}