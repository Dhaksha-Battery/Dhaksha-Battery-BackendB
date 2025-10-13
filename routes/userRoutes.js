// routes/userRoutes.js
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { addUserRow } from "../controllers/userController.js";

const router = express.Router();

// only allow POST /rows for authenticated users to submit
router.post("/", protect, addUserRow);

export default router;

  