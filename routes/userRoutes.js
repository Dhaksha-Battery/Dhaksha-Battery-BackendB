// routes/userRoutes.js
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  addUserRow,
  countBatteryCycles,
} from "../controllers/userController.js";

const router = express.Router();

// only allow POST /rows for authenticated users to submit
router.post("/", protect, addUserRow);

// charging cycle change
router.get("/cycles", protect, countBatteryCycles);

export default router;
