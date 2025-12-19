// controllers/userController.js
import { getRawValues, appendRow } from "../config/googleSheets.js";

/**
 * Helper: rows → objects
 */
async function getRowsAsObjectsSafe() {
  const values = await getRawValues();
  if (!Array.isArray(values) || values.length < 1) return [];

  const headers = values[0].map((h) => (h ? String(h).trim() : ""));
  const rows = values.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? "";
    });
    return obj;
  });
  return rows;
}

/**
 * ✅ SINGLE SOURCE OF TRUTH
 * Counts how many times a batteryId appears
 * in BOTH id and id_2 columns.
 */
async function countBatteryParticipation(batteryId) {
  const rows = await getRowsAsObjectsSafe();
  const bid = String(batteryId).trim();

  return rows.reduce((acc, r) => {
    const id1 = String(r.id ?? "").trim();
    const id2 = String(r.id_2 ?? "").trim();
    return id1 === bid || id2 === bid ? acc + 1 : acc;
  }, 0);
}

/**
 * GET /rows/cycles?batteryId=...
 * Lookup cycles (FIXED)
 */
export async function countBatteryCycles(req, res) {
  try {
    const batteryId = (req.query.batteryId || "").toString().trim();
    if (!batteryId) {
      return res
        .status(400)
        .json({ message: "batteryId (query param) is required" });
    }

    const cycles = await countBatteryParticipation(batteryId);
    return res.json({ batteryId, cycles });
  } catch (err) {
    console.error("countBatteryCycles error:", err);
    return res.status(500).json({ message: "Failed to count cycles" });
  }
}

/**
 * POST /rows
 * Supports single + dual battery submission
 */
export async function addUserRow(req, res) {
  try {
    const body = req.body || {};

    let primary = body;
    let secondary = null;

    if (body.primary && body.secondary) {
      primary = body.primary;
      secondary = body.secondary;
    }

    // ===== VALIDATION (PRIMARY) =====
    if (!primary.id || !String(primary.id).trim()) {
      return res.status(400).json({ message: "Battery ID is required" });
    }
    if (!primary.date) {
      return res.status(400).json({ message: "Date is required" });
    }
    if (!primary.name || !String(primary.name).trim()) {
      return res
        .status(400)
        .json({ message: "Responsible person's name is required" });
    }

    const primaryId = String(primary.id).trim();

    // ===== BUILD ROW OBJECT =====
    const rowObj = {
      // ---- BATTERY 1 ----
      id: primaryId,
      date: primary.date ?? "",
      customerName: primary.customerName ?? "",
      zone: primary.zone ?? "",
      location: primary.location ?? "",
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

      // ---- BATTERY 2 ----
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

    // ===== MAP TO SHEET HEADER =====
    const values2d = await getRawValues();
    const headerRow = values2d[0].map((h) => String(h || "").trim());

    const normalize = (s) =>
      s.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");

    const normalizedRow = {};
    Object.keys(rowObj).forEach((k) => {
      normalizedRow[normalize(k)] = rowObj[k];
    });

    const rowArray = headerRow.map((h) => normalizedRow[normalize(h)] ?? "");

    await appendRow(rowArray);

    // ===== ✅ FINAL CORRECT CYCLE COUNTS (AFTER INSERT) =====
    const battery1Cycles =
      (await countBatteryParticipation(primaryId)) + 0;

    let battery2Cycles = null;
    if (secondary?.id) {
      battery2Cycles =
        (await countBatteryParticipation(secondary.id)) + 0;
    }

    return res.status(201).json({
      message: "Submitted successfully",
      battery1: {
        id: primaryId,
        cycles: battery1Cycles,
      },
      battery2: secondary
        ? {
            id: secondary.id,
            cycles: battery2Cycles,
          }
        : null,
    });
  } catch (err) {
    console.error("addUserRow error:", err);
    return res.status(500).json({ message: "Submission failed" });
  }
}