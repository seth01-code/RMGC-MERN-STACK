import { GoogleSpreadsheet } from "google-spreadsheet";

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

async function initDoc() {
  if (!doc._rawProperties) {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
    await doc.loadInfo();
  }
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
    // Silent fail — spreadsheet must NEVER break registration
    console.error("Spreadsheet logging failed:", err.message);
  }
}
