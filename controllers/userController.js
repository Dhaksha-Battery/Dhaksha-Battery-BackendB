// controllers/userController.js
import { getRawValues, appendRow } from "../config/googleSheets.js";

/**
 * GET /rows/cycles?batteryId=...
 * Return count of rows for a battery id.
 */
export async function countBatteryCycles(req, res) {
  try {
    const batteryIdRaw = (req.query.batteryId || req.query.id || "")
      .toString()
      .trim();
    if (!batteryIdRaw) {
      return res
        .status(400)
        .json({ message: "batteryId (query param) is required" });
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

    // 🔹 SUPPORT SINGLE + DUAL MODE
    let primary = body;
    let secondary = null;

    if (body.primary && body.secondary) {
      primary = body.primary;
      secondary = body.secondary;
    }

    // ===== VALIDATIONS (PRIMARY ONLY) =====
    if (!primary.id || !String(primary.id).trim()) {
      return res.status(400).json({ message: "Battery ID (id) is required" });
    }
    if (!primary.date) {
      return res.status(400).json({ message: "Date is required" });
    }
    if (!primary.name || !String(primary.name).trim()) {
      return res
        .status(400)
        .json({ message: "Responsible person's name is required" });
    }

    const batteryId = String(primary.id).trim();

    // ===== COMPUTE CHARGING CYCLE (PRIMARY ONLY) =====
    let computedCycle = null;
    if (
      primary.chargingCycle === undefined ||
      primary.chargingCycle === null ||
      String(primary.chargingCycle).trim() === ""
    ) {
      const rows = await getRowsAsObjectsSafe();
      const count = rows.filter(
        (r) => String(r.id ?? "").trim() === batteryId
      ).length;
      computedCycle = count + 1;
    }

    // ===== ROW OBJECT (BATTERY 1 + BATTERY 2) =====
    const rowObj = {
      id: batteryId,
      date: primary.date ?? "",
      customerName: primary.customerName ?? "",
      zone: primary.zone ?? "",
      location: primary.location ?? "",
      chargingCycle: primary.chargingCycle ?? computedCycle ?? "",
      chargeCurrent: primary.chargeCurrent ?? "",
      battVoltInitial: primary.battVoltInitial ?? "",
      battVoltFinal: primary.battVoltFinal ?? "",
      chargeTimeInitial: primary.chargeTimeInitial ?? "",
      chargeTimeFinal: primary.chargeTimeFinal ?? "",
      duration: primary.duration ?? "",
      droneno: primary.droneno ?? "",
      temp: primary.temp ?? "",
      deformation: primary.deformation ?? "",
      others: primary.others ?? "",
      uin: primary.uin ?? "",
      name: primary.name ?? "",

      id_2: secondary?.id ?? "",
      date_2: secondary?.date ?? "",
      customerName_2: secondary?.customerName ?? "",
      zone_2: secondary?.zone ?? "",
      location_2: secondary?.location ?? "",
      chargeCurrent_2: secondary?.chargeCurrent ?? "",
      battVoltInitial_2: secondary?.battVoltInitial ?? "",
      battVoltFinal_2: secondary?.battVoltFinal ?? "",
      chargeTimeInitial_2: secondary?.chargeTimeInitial ?? "",
      chargeTimeFinal_2: secondary?.chargeTimeFinal ?? "",
      duration_2: secondary?.duration ?? "",
      droneno_2: secondary?.droneno ?? "",
      temp_2: secondary?.temp ?? "",
      deformation_2: secondary?.deformation ?? "",
      others_2: secondary?.others ?? "",
      uin_2: secondary?.uin ?? "",
      name_2: secondary?.name ?? "",
    };

    // ===== READ SHEET HEADER =====
    const values2d = await getRawValues();
    if (!Array.isArray(values2d) || !values2d.length) {
      return res.status(500).json({ message: "Sheet header missing" });
    }

    const headerRow = values2d[0].map((h) => String(h || "").trim());

    // 🔑 FIX: EXPLICIT HEADER → FIELD MAPPING
    const normalize = (s) =>
      s
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9_]/g, "");

    const headerToField = {};
    Object.keys(rowObj).forEach((k) => {
      headerToField[normalize(k)] = k;
    });

    //  normalize rowObj keys once
    const normalizedRowObj = {};
    Object.keys(rowObj).forEach((k) => {
      normalizedRowObj[normalize(k)] = rowObj[k];
    });

    //  map headers to normalized row object
    const rowArray = headerRow.map((hdr) => {
      const key = normalize(hdr);
      return normalizedRowObj[key] ?? "";
    });

    console.log("===== DEBUG DUAL BATTERY =====");
    console.log("PRIMARY DATA:", primary);
    console.log("SECONDARY DATA:", secondary);
    console.log("ROW OBJ:", rowObj);
    console.log("HEADER ROW:", headerRow);
    console.log("ROW ARRAY:", rowArray);
    console.log("===== END DEBUG =====");

    await appendRow(rowArray);

    return res.status(201).json({
      message: "Submitted successfully",
      chargingCycle: rowObj.chargingCycle,
      batteryId: rowObj.id,
    });
  } catch (err) {
    console.error("addUserRow error:", err);
    return res.status(500).json({ message: "Submission failed" });
  }
}
