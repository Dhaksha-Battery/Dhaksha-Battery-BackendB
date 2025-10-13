// controllers/userController.js
import { appendRow } from "../config/googleSheets.js";

/**
 * POST /rows
 * Accepts JSON body with these fields (id is battery id, provided by user):
 * id, date, chargingCycle, chargeCurrent,
 * battVoltInitial, battVoltFinal,
 * chargeTimeInitial, chargeTimeFinal, duration,
 * capacity, temp, deformation, others,
 * uin, name, photo
 */
export async function addUserRow(req, res) {
  try {
    const body = req.body || {};

    if (!body.id || !String(body.id).trim()) {
      return res.status(400).json({ message: "Battery ID (id) is required" });
    }
    if (!body.date) {
      return res.status(400).json({ message: "Date is required" });
    }
    if (!body.name) {
      return res.status(400).json({ message: "Responsible person's name is required" });
    }

    const rowObj = {
      id: String(body.id).trim(),
      date: body.date ?? "",
      chargingCycle: body.chargingCycle ?? "",
      chargeCurrent: body.chargeCurrent ?? "",
      battVoltInitial: body.battVoltInitial ?? "",
      battVoltFinal: body.battVoltFinal ?? "",
      chargeTimeInitial: body.chargeTimeInitial ?? "",
      chargeTimeFinal: body.chargeTimeFinal ?? "",
      duration: body.duration ?? "",
      capacity: body.capacity ?? "",
      temp: body.temp ?? "",
      deformation: body.deformation ?? "",
      others: body.others ?? "",
      uin: body.uin ?? "",
      name: body.name ?? "",
      photo: body.photo ?? "",
    };

    const rowArray = [
      rowObj.id,
      rowObj.date,
      rowObj.chargingCycle,
      rowObj.chargeCurrent,
      rowObj.battVoltInitial,
      rowObj.battVoltFinal,
      rowObj.chargeTimeInitial,
      rowObj.chargeTimeFinal,
      rowObj.duration,
      rowObj.capacity,
      rowObj.temp,
      rowObj.deformation,
      rowObj.others,
      rowObj.uin,
      rowObj.name,
      rowObj.photo,
    ];

    await appendRow(rowArray);

    return res.status(201).json({ message: "Submitted" });
  } catch (err) {
    console.error("addUserRow error:", err);
    return res.status(500).json({ message: "Failed to add row" });
  }
}

