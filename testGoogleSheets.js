// testGoogleSheets.js
const { google } = require('googleapis');

async function testSheets() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './config/credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  console.log("✅ Google Sheets client initialized!");
}

testSheets();