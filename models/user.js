import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // store bcrypt hash
  role: { type: String, enum: ["user","admin"], default: "user" },
  createdAt: { type: Date, default: Date.now },
  // add more fields if you want (e.g. lastLogin, meta)
});

export default mongoose.model("User", userSchema);