// routes/authRoutes.js
import express from "express";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    await register(req, res);
  } catch (err) {
    console.error("Register route error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

router.post("/login", async (req, res) => {
  try {
    await login(req, res);
  } catch (err) {
    console.error("Login route error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

export default router;