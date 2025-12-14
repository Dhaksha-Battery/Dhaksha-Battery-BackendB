// controllers/adminController.js
import { getRowsAsObjects } from "../config/googleSheets.js";

export async function getRowsByDate(req, res) {
  try {
    const dateQuery = (req.query.date || "").toString().trim();
    const dateFrom = (req.query.dateFrom || "").toString().trim();
    const dateTo = (req.query.dateTo || "").toString().trim();

    console.log(`getRowsByDate called, date=${dateQuery}, dateFrom=${dateFrom}, dateTo=${dateTo}, user=${req.user?.email || req.user?.id || "unknown"}`);

    const rows = await getRowsAsObjects();
    if (!rows || !rows.length) {
      return res.json([]);
    }

    // detect date header name
    const headerKeys = Object.keys(rows[0] || {});
    const dateHeader =
      headerKeys.find((h) => String(h || "").trim().toLowerCase() === "date")
      || headerKeys.find((h) => /(^|\W)date(\W|$)/i.test(String(h || "")));

    if (!dateHeader) {
      console.warn("getRowsByDate: no date header found. headers:", headerKeys);
      return res.status(500).json({ message: "Server misconfigured: date column not found in sheet" });
    }

    // Legacy single-date behavior
    if (dateQuery) {
      const matched = rows.filter((r) => {
        const rDate = (r[dateHeader] ?? "").toString().trim();
        return rDate === dateQuery;
      });
      return res.json(matched);
    }

    // Range behavior (both required)
    if (dateFrom && dateTo) {
      // parse as dates (assume YYYY-MM-DD)
      const fromTs = new Date(dateFrom + "T00:00:00Z").getTime();
      const toTs = new Date(dateTo + "T23:59:59Z").getTime();

      const matched = rows.filter((r) => {
        const rDateStr = (r[dateHeader] ?? "").toString().trim();
        if (!rDateStr) return false;
        // Try stable parse: treat rDateStr as YYYY-MM-DD if possible
        const candidateTs = new Date(rDateStr + "T12:00:00Z").getTime();
        if (isNaN(candidateTs)) return false;
        return candidateTs >= fromTs && candidateTs <= toTs;
      });

      return res.json(matched);
    }

    // If neither single date nor range provided, bad request
    return res.status(400).json({ message: "Provide 'date' or both 'dateFrom' and 'dateTo' query params." });
  } catch (err) {
    console.error("getRowsByDate error:", err);
    return res.status(500).json({ message: "Failed to fetch rows by date" });
  }
}

/**
 * GET /admin/rows/export?batteryId=... OR ?date=... OR ?dateFrom=...&dateTo=...
 * batteryId takes precedence if both provided.
 */
export async function exportCsv(req, res) {
  try {
    const batteryId = (req.query.batteryId || "").toString().trim();
    const dateQuery = (req.query.date || "").toString().trim();
    const dateFrom = (req.query.dateFrom || "").toString().trim();
    const dateTo = (req.query.dateTo || "").toString().trim();

    let rows = await getRowsAsObjects();
    if (!rows) rows = [];

    // detect header keys for fallback if sheet empty
    const sheetHeaderKeys = rows.length ? Object.keys(rows[0]) : [];

    if (batteryId) {
      rows = rows.filter((r) => String(r.id ?? "").trim() === batteryId);
    } else if (dateQuery) {
      const dateHeader =
        sheetHeaderKeys.find((h) => String(h || "").trim().toLowerCase() === "date")
        || sheetHeaderKeys.find((h) => /(^|\W)date(\W|$)/i.test(String(h || "")));
      if (dateHeader) {
        rows = rows.filter((r) => (r[dateHeader] ?? "").toString().trim() === dateQuery);
      } else {
        console.warn("exportCsv: date header not found, cannot filter by date.");
      }
    } else if (dateFrom && dateTo) {
      const dateHeader =
        sheetHeaderKeys.find((h) => String(h || "").trim().toLowerCase() === "date")
        || sheetHeaderKeys.find((h) => /(^|\W)date(\W|$)/i.test(String(h || "")));
      if (dateHeader) {
        const fromTs = new Date(dateFrom + "T00:00:00Z").getTime();
        const toTs = new Date(dateTo + "T23:59:59Z").getTime();
        rows = rows.filter((r) => {
          const rDateStr = (r[dateHeader] ?? "").toString().trim();
          if (!rDateStr) return false;
          const candidateTs = new Date(rDateStr + "T12:00:00Z").getTime();
          if (isNaN(candidateTs)) return false;
          return candidateTs >= fromTs && candidateTs <= toTs;
        });
      } else {
        console.warn("exportCsv: date header not found, cannot filter by date range.");
      }
    }

    // header keys fallback
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
      : dateFrom && dateTo
      ? `rows_${dateFrom}_to_${dateTo}_export.csv`
      : `battery_all_export.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(csvText);
  } catch (err) {
    console.error("exportCsv error:", err);
    return res.status(500).json({ message: "Failed to export CSV" });
  }
}

export async function getAllRows(req, res) {
  try {
    const rows = await getRowsAsObjects();
    return res.json(rows);
  } catch (err) {
    console.error("getAllRows error:", err);
    return res.status(500).json({ message: "Failed to fetch rows" });
  }
}

export async function searchByBatteryId(req, res) {
  try {
    const batteryId = (req.query.batteryId || "").toString().trim();
    if (!batteryId) {
      return res.status(400).json({ message: "batteryId query param required" });
    }

    const rows = await getRowsAsObjects();
    const filtered = rows.filter(
      (r) => String(r.id ?? "").trim() === batteryId
    );

    return res.json(filtered);
  } catch (err) {
    console.error("searchByBatteryId error:", err);
    return res.status(500).json({ message: "Failed to search rows" });
  }
}
