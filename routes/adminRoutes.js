// routes/adminRoutes.js
import express from "express";
import { authAdmin } from "../middlewares/authMiddleware.js"; // your admin middleware

import {
  getAllRows,
  searchByBatteryId,
  exportCsv,
  getRowsByDate,
} from "../controllers/adminController.js";

const router = express.Router();

// GET all rows
router.get("/rows", authAdmin, getAllRows);

// Search by battery ID
router.get("/rows/search", authAdmin, searchByBatteryId);

// Export by ID or by date (query params handled in controller)
router.get("/rows/export", authAdmin, exportCsv);

// NEW: Search rows by date
router.get("/rows/by-date", authAdmin, getRowsByDate);

export default router;