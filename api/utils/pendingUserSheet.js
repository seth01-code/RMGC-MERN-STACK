import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

let doc;

/**
 * Initialize Google Sheet safely
 */
async function initDoc() {
  if (doc) return;

  const {
    GOOGLE_SHEET_ID,
    GOOGLE_CLIENT_EMAIL,
    GOOGLE_PRIVATE_KEY,
  } = process.env;

  // Hard safety guard — NEVER crash app
  if (!GOOGLE_SHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error("❌ Google Sheets env vars missing");
    return;
  }

  const auth = new JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID, auth);
  await doc.loadInfo();
}

/**
 * Sheet routing logic (authoritative)
 */
function getSheetByRole(user) {
  if (user.role === "organization") return "Organizations_Pending";
  if (user.role === "remote_worker") return "Remote_Workers_Pending";
  if (user.isSeller === true) return "Freelancers_Pending";
  if (user.isSeller === false) return "Clients_Pending";
  return "Others_Pending";
}

export async function savePendingUserToSheet(user) {
  try {
    await initDoc();
    if (!doc) return; // safety

    const sheetTitle = getSheetByRole(user);
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet) return;

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
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,

      accountType,
      isSeller: user.isSeller ? "yes" : "no",
      tier: user.tier || "free",

      country: user.country,
      stateOfResidence: user.stateOfResidence,
      countryOfResidence: user.countryOfResidence,
      yearsOfExperience: user.yearsOfExperience || "",

      languages: user.languages?.join(", "),
      services: user.services?.join(", "),

      nextOfKinName: user.nextOfKin?.fullName || "",
      nextOfKinPhone: user.nextOfKin?.phone || "",

      organizationName: user.organization?.name || "",
      organizationIndustry: user.organization?.industry || "",
      organizationSize: user.organization?.companySize || "",

      status: "pending",
      lastUpdated: new Date().toISOString(),
    };

    if (existing) {
      Object.keys(rowData).forEach((key) => {
        existing[key] = rowData[key];
      });
      await existing.save();
    } else {
      await sheet.addRow(rowData);
    }
  } catch (err) {
    console.error("Spreadsheet logging failed:", err.message);
  }
}
