// models/user.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true }, // bcrypt hash
  role: { type: String, enum: ["user", "admin"], default: "user" },
  createdAt: { type: Date, default: Date.now },

  // OTP for password reset (store hashed otp, not plaintext)
  resetOtpHash: { type: String }, // (otp)
  resetOtpExpires: { type: Date, default: null }, // expiry date
  resetOtpAttempts: { type: Number, default: 0 }, // optional attempt counter
});

export default mongoose.model("User", userSchema);