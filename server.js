// server.js
import dotenv from "dotenv";
dotenv.config(); // << load env first

import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { initAdmin } from "./config/initAdmin.js";
import { connectDB } from "./config/db.js";

const app = express();
const __dirname = path.resolve();

app.use(
  cors({
    origin: [
      "https://<YOUR-NEW-FRONTEND>.onrender.com",
      "http://localhost:5173", // optional for local testing
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/auth", authRoutes);
app.use("/rows", userRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => res.send("✅ Battery Log Backend is Running"));

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB(); // now has access to env vars
    await initAdmin(); // seed admin after DB connect
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("Startup failed:", err);
    // optional: exit process if DB is critical
    process.exit(1);
  }
}

start();

// extra safety: log unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
