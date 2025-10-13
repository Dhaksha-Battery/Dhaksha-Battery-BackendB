// scripts/migrateUsers.js
import fs from "fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/user.js";

dotenv.config();

async function migrateUsers() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("❌ MONGO_URI missing in .env");
      process.exit(1);
    }

    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ Connected to MongoDB");

    const filePath = "./config/users.json";

    if (!fs.existsSync(filePath)) {
      console.log("⚠️ No users.json file found — nothing to migrate.");
      process.exit(0);
    }

    const fileData = fs.readFileSync(filePath, "utf8");
    const users = JSON.parse(fileData);

    if (!Array.isArray(users) || users.length === 0) {
      console.log("⚠️ No users found in users.json.");
      process.exit(0);
    }

    let insertedCount = 0;
    for (const u of users) {
      const existing = await User.findOne({ email: u.email.toLowerCase() });
      if (existing) {
        console.log(`⏩ Skipping existing user: ${u.email}`);
        continue;
      }

      // If password isn’t hashed, hash it
      let password = u.password;
      if (!u.password.startsWith("$2a$")) {
        password = await bcrypt.hash(u.password, 10);
      }

      await User.create({
        name: u.name || "Unnamed",
        email: u.email.toLowerCase(),
        password,
        role: u.role || "user",
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      });

      insertedCount++;
      console.log(`✅ Imported user: ${u.email}`);
    }

    console.log(`🎉 Migration complete! ${insertedCount} new user(s) added.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateUsers();