// controllers/userController.js
import { getRawValues, appendRow } from "../config/googleSheets.js";

/**
 * GET /rows/cycles?batteryId=...
 * Return count of rows for a battery id.
 */
export async function countBatteryCycles(req, res) {
  try {
    const batteryIdRaw = (req.query.batteryId || req.query.id || "").toString().trim();
    if (!batteryIdRaw) {
      return res.status(400).json({ message: "batteryId (query param) is required" });
    }

    const rows = await getRowsAsObjectsSafe();
    const batteryId = batteryIdRaw;
    const cycles = rows.reduce((acc, r) => {
      const cell = (r.id ?? "").toString().trim();
      return acc + (cell === batteryId ? 1 : 0);
    }, 0);

    return res.json({ batteryId, cycles });
  } catch (err) {
    console.error("countBatteryCycles error:", err);
    return res.status(500).json({ message: "Failed to count cycles" });
  }
}

/**
 * Helper that returns rows as array of objects by mapping header -> value.
 * Uses getRawValues (2D) and maps header row to subsequent rows.
 */
async function getRowsAsObjectsSafe() {
  const values = await getRawValues(); // from googleSheets.js
  if (!Array.isArray(values) || values.length < 1) return [];

  const headers = values[0].map((h) => (h ? String(h).trim() : ""));
  const rows = values.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      const key = h || `col${i}`;
      obj[key] = r[i] ?? "";
    });
    return obj;
  });
  return rows;
}

/**
 * POST /rows
 * Accepts JSON body and appends a row to the Google Sheet.
 * If chargingCycle is not provided, server computes it as (existing rows for that battery id) + 1.
 * Uses sheet header row to determine append order, preventing column shifts.
 */
export async function addUserRow(req, res) {
  try {
    const body = req.body || {};
    // minimal validations
    if (!body.id || !String(body.id).trim()) {
      return res.status(400).json({ message: "Battery ID (id) is required" });
    }
    if (!body.date) {
      return res.status(400).json({ message: "Date is required" });
    }
    if (!body.name || !String(body.name).trim()) {
      return res.status(400).json({ message: "Responsible person's name is required" });
    }

    const batteryId = String(body.id).trim();

    // compute chargingCycle if not provided
    let computedCycle = null;
    if (body.chargingCycle === undefined || body.chargingCycle === null || String(body.chargingCycle).trim() === "") {
      try {
        const existingRows = await getRowsAsObjectsSafe();
        const existingCount = existingRows.reduce((acc, r) => {
          // header keys may be any case; try to check common header names
          // prefer `id` exact key, otherwise search keys for something like 'id' or 'batteryid'
          const idVal = (r.id ?? r.ID ?? r.Id ?? r.batteryId ?? r.batteryid ?? "").toString().trim();
          return acc + (idVal === batteryId ? 1 : 0);
        }, 0);
        computedCycle = existingCount + 1;
      } catch (countErr) {
        console.warn("addUserRow: could not compute chargingCycle, continuing without computed value:", countErr && countErr.message ? countErr.message : countErr);
      }
    }

    // normalized row object (source values)
    const rowObj = {
      id: batteryId,
      date: body.date ?? "",
      customerName: body.customerName ?? body.CustomerName ?? "",
      zone: body.zone ?? body.Zone ?? "",
      location: body.location ?? body.Location ?? "",
      chargingCycle:
        body.chargingCycle !== undefined && body.chargingCycle !== null && String(body.chargingCycle).trim() !== ""
          ? body.chargingCycle
          : computedCycle ?? "",
      chargeCurrent: body.chargeCurrent ?? "",
      battVoltInitial: body.battVoltInitial ?? body.battVoltInitial ?? "",
      battVoltFinal: body.battVoltFinal ?? "",
      chargeTimeInitial: body.chargeTimeInitial ?? "",
      chargeTimeFinal: body.chargeTimeFinal ?? "",
      duration: body.duration ?? "",
      droneno: body.droneno ?? "",
      temp: body.temp ?? "",
      deformation: body.deformation ?? "",
      others: body.others ?? "",
      uin: body.uin ?? "",
      name: body.name ?? "",
    };

    // Read sheet header row to build append order
    let values2d;
    try {
      values2d = await getRawValues();
    } catch (gErr) {
      console.error("addUserRow: getRawValues error:", gErr && gErr.message ? gErr.message : gErr);
      return res.status(500).json({ message: "Failed to read sheet header", detail: gErr?.message ?? String(gErr) });
    }

    // If header row missing or invalid, use fallback order (legacy)
    if (!Array.isArray(values2d) || values2d.length === 0) {
      console.warn("addUserRow: no header row found, using fallback append order");
      const fallback = [
        rowObj.id,
        rowObj.date,
        rowObj.customerName,
        rowObj.zone,
        rowObj.location,
        rowObj.chargingCycle,
        rowObj.chargeCurrent,
        rowObj.battVoltInitial,
        rowObj.battVoltFinal,
        rowObj.chargeTimeInitial,
        rowObj.chargeTimeFinal,
        rowObj.duration,
        rowObj.droneno,
        rowObj.temp,
        rowObj.deformation,
        rowObj.others,
        rowObj.uin,
        rowObj.name,
      ];
      try {
        await appendRow(fallback);
        return res.status(201).json({ message: "Submitted (fallback order)", chargingCycle: rowObj.chargingCycle, batteryId: rowObj.id });
      } catch (appErr) {
        console.error("addUserRow: appendRow fallback error:", appErr && appErr.message ? appErr.message : appErr);
        return res.status(500).json({ message: "Failed to append row (fallback)", detail: appErr?.message ?? String(appErr) });
      }
    }

    const headerRow = values2d[0].map((h) => (h ? String(h).trim() : ""));
    console.log("addUserRow: detected headerRow:", headerRow);

    // normalize header to a matching key name in rowObj
    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "");

    // map several common header names to our rowObj keys
    const headerToField = {
      id: "id",
      batteryid: "id",
      battery: "id",
      date: "date",
      customername: "customerName",
      customer: "customerName",
      zone: "zone",
      location: "location",
      chargingcycle: "chargingCycle",
      chargecycle: "chargingCycle",
      chargecurrent: "chargeCurrent",
      battvoltinitial: "battVoltInitial",
      battvoltfinal: "battVoltFinal",
      chargetimeinitial: "chargeTimeInitial",
      chargetimefinal: "chargeTimeFinal",
      duration: "duration",
      droneno: "droneno",
      temp: "temp",
      temperature: "temp",
      deformation: "deformation",
      others: "others",
      uin: "uin",
      name: "name",
    };

    // construct rowArray in header order
    const rowArray = headerRow.map((hdr) => {
      const key = normalize(hdr);
      const mapped = headerToField[key];
      if (mapped && Object.prototype.hasOwnProperty.call(rowObj, mapped)) {
        return rowObj[mapped];
      }

      // fallback: header exactly matches rowObj property name (case-sensitive)
      if (Object.prototype.hasOwnProperty.call(rowObj, hdr)) {
        return rowObj[hdr];
      }

      // final fallback: empty cell
      return "";
    });

    console.log("addUserRow: final rowArray to append:", rowArray);

    try {
      await appendRow(rowArray);
      return res.status(201).json({ message: "Submitted", chargingCycle: rowObj.chargingCycle, batteryId: rowObj.id });
    } catch (appendErr) {
      console.error("addUserRow: appendRow error:", appendErr && appendErr.message ? appendErr.message : appendErr);
      return res.status(500).json({ message: "Failed to append row", detail: appendErr?.message ?? String(appendErr) });
    }
  } catch (err) {
    console.error("addUserRow unexpected error:", err && err.message ? err.message : err);
    return res.status(500).json({ message: "Unexpected server error", detail: err?.message ?? String(err) });
  }
}