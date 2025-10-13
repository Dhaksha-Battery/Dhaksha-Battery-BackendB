// routes/adminRoutes.js
import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import { getAllRows, searchByBatteryId, exportCsv } from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require admin role
router.get("/rows", protect, adminOnly, getAllRows);
router.get("/rows/search", protect, adminOnly, searchByBatteryId);
router.get("/rows/export", protect, adminOnly, exportCsv);

export default router;

