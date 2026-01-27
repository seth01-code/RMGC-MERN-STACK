// utils/pendingUserSheet.js
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// --------------------
// SAFETY CHECK: Env vars
// --------------------
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (PRIVATE_KEY) {
  // PM2 / Windows safe: remove extra quotes and fix newlines
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
}

if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.warn(
    "⚠️ Google Sheets env vars missing or invalid — logging disabled",
  );
}

// --------------------
// Auth & doc instance
// --------------------
const serviceAccountAuth =
  CLIENT_EMAIL && PRIVATE_KEY
    ? new JWT({
        email: CLIENT_EMAIL,
        key: PRIVATE_KEY,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    : null;

const doc =
  serviceAccountAuth && SHEET_ID
    ? new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth)
    : null;

// --------------------
// Init doc once
// --------------------
async function initDoc() {
  if (!doc) return;
  if (!doc.title) {
    await doc.loadInfo();
    console.log(`📄 Loaded spreadsheet: ${doc.title}`);
  }
}

// --------------------
// Ensure headers exist
// --------------------
async function ensureHeaders(sheet) {
  if (!sheet.headerValues || sheet.headerValues.length === 0) {
    const headers = [
      "email",
      "username",
      "fullName",
      "phone",
      "accountType",
      "isSeller",
      "tier",
      "country",
      "stateOfResidence",
      "countryOfResidence",
      "yearsOfExperience",
      "languages",
      "services",
      "nextOfKinName",
      "nextOfKinPhone",
      "organizationName",
      "organizationIndustry",
      "organizationSize",
      "status",
      "lastUpdated",
    ];
    await sheet.setHeaderRow(headers);
    console.log(`📝 Headers set for sheet: ${sheet.title}`);
  }
}

// --------------------
// Sheet routing
// --------------------
function getSheetByRole(user) {
  if (!user) return null;
  if (user.role === "organization") return "Organizations_Pending";
  if (user.role === "remote_worker") return "Remote_Workers_Pending";
  if (user.isSeller === true) return "Freelancers_Pending";
  if (user.isSeller === false) return "Clients_Pending";
  return "Others_Pending";
}

// --------------------
// Main safe logger
// --------------------
export async function savePendingUserToSheet(user) {
  try {
    if (!doc) return console.warn("No doc configured, skipping sheet logging");
    if (!user) return console.warn("No user provided, skipping sheet logging");

    await initDoc();

    const sheetName = getSheetByRole(user);
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      return console.warn(
        `Sheet not found: ${sheetName}. Check the exact tab name in spreadsheet`,
      );
    }

    await ensureHeaders(sheet);

    const rows = await sheet.getRows();
    const existing = rows.find((r) => r.email === user.email);

    const accountType =
      user.role === "organization"
        ? "organization"
        : user.role === "remote_worker"
          ? "remote_worker"
          : user.isSeller
            ? "freelancer"
            : "client";

    const rowData = {
      email: user.email,
      username: user.username || "",
      fullName: user.fullName || "",
      phone: user.phone || "",
      accountType,
      isSeller: user.isSeller ? "yes" : "no",
      tier: user.tier || "free",
      country: user.country || "",
      stateOfResidence: user.stateOfResidence || "",
      countryOfResidence: user.countryOfResidence || "",
      yearsOfExperience: user.yearsOfExperience || "",
      languages: user.languages?.join(", ") || "",
      services: user.services?.join(", ") || "",
      nextOfKinName: user.nextOfKin?.fullName || "",
      nextOfKinPhone: user.nextOfKin?.phone || "",
      organizationName: user.organization?.name || "",
      organizationIndustry: user.organization?.industry || "",
      organizationSize: user.organization?.companySize || "",
      status: "pending",
      lastUpdated: new Date().toISOString(),
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
