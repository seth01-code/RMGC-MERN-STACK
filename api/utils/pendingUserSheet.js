import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

function getDoc() {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID?.trim();
  const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (PRIVATE_KEY) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n")
      .replace(/\r/g, "")
      .replace(/^"|"$/g, "")
      .trim();
  }

  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    console.warn("⚠️ Google Sheets env vars missing or invalid");
    return null;
  }

  const serviceAccountAuth = new JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
}

export async function savePendingUserToSheet(user) {
  try {
    const doc = getDoc();
    if (!doc) return console.warn("No doc configured, skipping sheet logging");
    if (!user) return console.warn("No user provided, skipping sheet logging");

    await doc.loadInfo();

    const sheetName = "PendingUsers"; // your sheet tab name
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) return console.warn(`Sheet not found: ${sheetName}`);

    // ✅ No need to set headers since we did it manually
    await sheet.loadHeaderRow(); // just to ensure headers are loaded

    const rows = await sheet.getRows();
    const existing = rows.find((r) => r.email === user.email);

    const rowData = {
      name: user.username || user.fullName || "",
      email: user.email,
      phone: user.phone || "",
      accountType: user.role || (user.isSeller ? "freelancer" : "client"),
    };

    if (existing) {
      Object.assign(existing, rowData);
      await existing.save();
      console.log(`♻️ Updated row for: ${user.email}`);
    } else {
      await sheet.addRow(rowData);
      console.log(`✅ Added row for: ${user.email}`);
    }
  } catch (err) {
    console.error("Spreadsheet logging failed:", err.message);
  }
}
