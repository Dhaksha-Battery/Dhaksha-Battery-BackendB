// controllers/adminController.js
import { getRowsAsObjects } from "../config/googleSheets.js";

/**
 * GET /admin/rows
 * Returns all rows as array of objects keyed by header.
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
 * Returns rows matching id
 */
export async function searchByBatteryId(req, res) {
  try {
    const batteryId = req.query.batteryId;
    if (!batteryId) return res.status(400).json({ message: "batteryId query param required" });

    const rows = await getRowsAsObjects();
    const filtered = rows.filter((r) => String(r.id) === String(batteryId));
    return res.json(filtered);
  } catch (err) {
    console.error("searchByBatteryId error:", err);
    return res.status(500).json({ message: "Failed to search rows" });
  }
}

/**
 * GET /admin/rows/export?batteryId=...
 * Returns CSV with header row for either matching batteryId or all rows.
 */
export async function exportCsv(req, res) {
  try {
    const batteryId = req.query.batteryId;
    let rows = await getRowsAsObjects();

    if (batteryId) {
      rows = rows.filter((r) => String(r.id) === String(batteryId));
    }

    // build CSV: header from keys (preserve order)
    const headerKeys = rows.length ? Object.keys(rows[0]) : [
      "id","date","chargingCycle","chargeCurrent","battVoltInitial","battVoltFinal","chargeTimeInitial","chargeTimeFinal","duration","capacity","temp","deformation","others","uin","name","photo"
    ];

    const csvRows = [];
    csvRows.push(headerKeys.join(","));
    for (const r of rows) {
      const line = headerKeys.map(k => {
        const v = r[k] ?? "";
        // escape double quotes
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(",");
      csvRows.push(line);
    }
    const csvText = csvRows.join("\n");

    const fileName = batteryId ? `battery_${batteryId}_export.csv` : `battery_all_export.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(csvText);
  } catch (err) {
    console.error("exportCsv error:", err);
    return res.status(500).json({ message: "Failed to export CSV" });
  }
}