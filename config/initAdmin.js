// config/initAdmin.js
import bcrypt from "bcryptjs";
import User from "../models/user.js";

/**
 * Seeds a default admin account if one doesn’t exist.
 */
export async function initAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@test.com";
    const adminPass = process.env.ADMIN_PASS || "123456";
    const adminName = process.env.ADMIN_NAME || "Default Admin";

    // Check if admin already exists in DB
    const adminExists = await User.findOne({ email: adminEmail.toLowerCase(), role: "admin" });

    if (adminExists) {
      console.log("✅ Admin already exists, skipping creation.");
      return;
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPass, 10);

    // Create default admin
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      role: "admin",
    });

    console.log("👑 Default admin created successfully:");
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASS ? "(from .env)" : "123456"}`);
  } catch (error) {
    console.error("❌ Failed to initialize admin:", error);
    throw error;
  }
}