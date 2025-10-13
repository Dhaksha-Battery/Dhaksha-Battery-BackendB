// config/googleSheets.js
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./config/credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "Sheet1";

/**
 * Return raw values (2D array) from A:Z
 */
export async function getRawValues() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
  });
  return res.data.values || [];
}

/**
 * Return array of objects, mapped by header row.
 * Example: [{ id: '123', date: '2025-10-08', ... }, ...]
 */
export async function getRowsAsObjects() {
  const values = await getRawValues();
  if (!values.length) return [];
  const header = values[0].map((h) => (h ? String(h).trim() : ""));
  const rows = values.slice(1).map((row) => {
    const obj = {};
    header.forEach((colName, i) => {
      obj[colName || `col${i}`] = row[i] ?? "";
    });
    return obj;
  });
  return rows;
}

/**
 * Append a single row (array of values) to the sheet.
 * rowArray must be an array of primitives matching the header order.
 */
export async function appendRow(rowArray) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: { values: [rowArray] },
  });
}
