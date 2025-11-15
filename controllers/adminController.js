// controllers/adminController.js
import { getRowsAsObjects } from "../config/googleSheets.js";

/**
 * GET /admin/rows
 */
export async function getAllRows(req, res) {
  try {
    const rows = await getRowsAsObjects();
    return res.json(rows);
  } catch (err) {
    console.error("getAllRows error:", err);
    return res.status(500).json({ message: "Failed to fetch rows" });
  }
}

/**
 * GET /admin/rows/search?batteryId=...
 */
export async function searchByBatteryId(req, res) {
  try {
    const batteryId = (req.query.batteryId || "").toString().trim();
    if (!batteryId) {
      return res.status(400).json({ message: "batteryId query param required" });
    }

    const rows = await getRowsAsObjects();
    const filtered = rows.filter((r) => String(r.id ?? "").trim() === batteryId);
    return res.json(filtered);
  } catch (err) {
    console.error("searchByBatteryId error:", err);
    return res.status(500).json({ message: "Failed to search rows" });
  }
}

/**
 * GET /admin/rows/by-date?date=YYYY-MM-DD
 */
export async function getRowsByDate(req, res) {
  try {
    const dateQuery = (req.query.date || "").toString().trim();
    if (!dateQuery) {
      return res.status(400).json({ message: "date query param required (YYYY-MM-DD)" });
    }

    console.log(`getRowsByDate called, date=${dateQuery}, user=${req.user?.email || req.user?.id || "unknown"}`);

    const rows = await getRowsAsObjects();
    if (!rows || !rows.length) {
      // no data in sheet
      return res.json([]);
    }

    // detect header that represents the date column (case-insensitive, trims)
    const headerKeys = Object.keys(rows[0] || {});
    const dateHeader =
      headerKeys.find((h) => String(h || "").trim().toLowerCase() === "date")
      || headerKeys.find((h) => /(^|\W)date(\W|$)/i.test(String(h || "")));

    if (!dateHeader) {
      console.warn("getRowsByDate: no date header found. headers:", headerKeys);
      return res.status(500).json({ message: "Server misconfigured: date column not found in sheet" });
    }

    const matched = rows.filter((r) => {
      const rDate = (r[dateHeader] ?? "").toString().trim();
      return rDate === dateQuery;
    });

    return res.json(matched);
  } catch (err) {
    console.error("getRowsByDate error:", err);
    return res.status(500).json({ message: "Failed to fetch rows by date" });
  }
}

/**
 * GET /admin/rows/export?batteryId=... OR ?date=...
 * batteryId takes precedence if both provided.
 */
export async function exportCsv(req, res) {
  try {
    const batteryId = (req.query.batteryId || "").toString().trim();
    const dateQuery = (req.query.date || "").toString().trim();

    let rows = await getRowsAsObjects();
    if (!rows) rows = [];

    // detect header keys for fallback if sheet empty
    const sheetHeaderKeys = rows.length ? Object.keys(rows[0]) : [];

    if (batteryId) {
      rows = rows.filter((r) => String(r.id ?? "").trim() === batteryId);
    } else if (dateQuery) {
      // detect date header name
      const dateHeader =
        sheetHeaderKeys.find((h) => String(h || "").trim().toLowerCase() === "date")
        || sheetHeaderKeys.find((h) => /(^|\W)date(\W|$)/i.test(String(h || "")));

      if (!dateHeader) {
        console.warn("exportCsv: date header not found, cannot filter by date.");
        // fallthrough => rows will remain as-is (or empty)
      } else {
        rows = rows.filter((r) => (r[dateHeader] ?? "").toString().trim() === dateQuery);
      }
    }

    // If there are rows, use their keys as header. Otherwise fallback to default known keys.
    const headerKeys = rows.length
      ? Object.keys(rows[0])
      : [
          "id",
          "date",
          "customerName",
          "zone",
          "location",
          "chargeCurrent",
          "battVoltInitial",
          "battVoltFinal",
          "chargeTimeInitial",
          "chargeTimeFinal",
          "duration",
          "droneno",
          "temp",
          "deformation",
          "others",
          "uin",
          "name",
        ];

    const csvRows = [];
    csvRows.push(headerKeys.join(","));
    for (const r of rows) {
      const line = headerKeys
        .map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`)
        .join(",");
      csvRows.push(line);
    }
    const csvText = csvRows.join("\n");

    const fileName = batteryId
      ? `battery_${batteryId}_export.csv`
      : dateQuery
      ? `rows_${dateQuery}_export.csv`
      : `battery_all_export.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(csvText);
  } catch (err) {
    console.error("exportCsv error:", err);
    return res.status(500).json({ message: "Failed to export CSV" });
  }
}