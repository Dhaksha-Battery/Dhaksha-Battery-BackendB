import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI not set in .env");
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("✅ MongoDB connected");
}