// config/googleSheets.js
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const SHEET_ID = process.env.SHEET_ID || process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "Sheet1";

function createSheetsClient() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFile) {
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return google.sheets({ version: "v4", auth });
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  }

  const looksLikePem =
    /^-----BEGIN PRIVATE KEY-----\n[\s\S]+?\n-----END PRIVATE KEY-----\n?$/.test(privateKey);

  if (!clientEmail || !privateKey || !looksLikePem) {
    console.warn("googleSheets: missing or invalid credentials (use GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY)");
    // Return a client that will error when used (so the error is explicit where called)
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

const sheets = createSheetsClient();

function ensureConfig() {
  if (!SHEET_ID) {
    const err = new Error("Server misconfigured: missing SHEET_ID / SPREADSHEET_ID");
    err.code = "MISSING_SHEET_ID";
    throw err;
  }
  if (!sheets || !sheets.spreadsheets) {
    const err = new Error("Google Sheets client not initialized correctly (check credentials).");
    err.code = "SHEETS_CLIENT_ERROR";
    throw err;
  }
}

export async function getRawValues() {
  ensureConfig();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:AZ`,
  });
  return res.data.values || [];
}

export async function getRowsAsObjects() {
  const values = await getRawValues();
  if (!values.length) return [];
  const header = values[0].map(h => (h ? String(h).trim() : ""));
  return values.slice(1).map(row => {
    const obj = {};
    header.forEach((colName, i) => {
      obj[colName || `col${i}`] = row[i] ?? "";
    });
    return obj;
  });
}

export async function appendRow(rowArray) {
  ensureConfig();
  if (!Array.isArray(rowArray)) throw new Error("appendRow expects array");
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:AZ`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [rowArray] },
  });
  return res.data;
}
