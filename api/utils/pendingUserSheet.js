import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const serviceAccountAuth =
  process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
    ? new JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    : null;

const doc =
  serviceAccountAuth && process.env.GOOGLE_SHEET_ID
    ? new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth)
    : null;

async function initDoc() {
  if (!doc) return;
  if (!doc.title) await doc.loadInfo();
}

async function ensureHeaders(sheet) {
  if (!sheet.headerValues || sheet.headerValues.length === 0) {
    await sheet.setHeaderRow([
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
    ]);
    console.log(`Headers set for sheet: ${sheet.title}`);
  }
}

function getSheetByRole(user) {
  if (user.role === "organization") return "Organizations_Pending";
  if (user.role === "remote_worker") return "Remote_Workers_Pending";
  if (user.isSeller === true) return "Freelancers_Pending";
  if (user.isSeller === false) return "Clients_Pending";
  return "Others_Pending";
}

export async function savePendingUserToSheet(user) {
  try {
    if (!doc || !user) return console.warn("No doc or user provided");

    await initDoc();

    const sheetTitle = getSheetByRole(user);
    const sheet = doc.sheetsByTitle[sheetTitle];
    if (!sheet)
      return console.warn(
        `Sheet not found: ${sheetTitle}. Check exact tab name in spreadsheet`,
      );

    await ensureHeaders(sheet);

    // Check if duplicate email exists
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
      console.log(`Updated row for email: ${user.email}`);
    } else {
      await sheet.addRow(rowData);
      console.log(`Added row for email: ${user.email}`);
    }
  } catch (err) {
    console.error("Spreadsheet logging failed:", err.message);
  }
}
