import { getApiUser } from "@/lib/dal";
import {
  importHospitalUsers,
  UserImportValidationError,
  validateHospitalUserImport,
} from "@/lib/data/user-import";
import { corsJson } from "@/lib/cors";
import { csvCell } from "@/lib/csv";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") return corsJson({ error: "Only administrators can import users" }, { status: 403 });
  const csv = "firstName,lastName,badgeNumber,email,accountType,jobType,units\r\nJamie,Nurse,30001,jamie@example.com,WORKER,RN,ICU|ED\r\n";
  return new Response(csv, {
    headers: { ...NO_STORE, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="statworkforce-user-import-template.csv"' },
  });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") return corsJson({ error: "Only administrators can import users" }, { status: 403 });
  let file: FormDataEntryValue | null;
  try { file = (await request.formData()).get("file"); }
  catch { return corsJson({ error: "Expected multipart/form-data" }, { status: 400 }); }
  if (!(file instanceof File) || file.size === 0) return corsJson({ error: "Select a non-empty CSV file" }, { status: 400 });
  const mode = new URL(request.url).searchParams.get("mode");
  try {
    if (mode === "preview") {
      const report = await validateHospitalUserImport(user, file);
      return corsJson({ totalRows: report.totalRows, validCount: report.validCount, errorCount: report.errorCount, errors: report.errors }, { headers: NO_STORE });
    }
    if (mode !== "import") return corsJson({ error: "Mode must be preview or import" }, { status: 400 });
    const credentials = await importHospitalUsers(user, file);
    const rows = [["badgeNumber", "temporaryPassword"], ...credentials.map((item) => [item.badgeNumber, item.temporaryPassword])];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
    return new Response(csv, {
      headers: { ...NO_STORE, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="statworkforce-imported-user-credentials.csv"' },
    });
  } catch (error) {
    if (error instanceof UserImportValidationError) {
      return corsJson({ error: error.message, totalRows: error.report.totalRows, errors: error.report.errors }, { status: 400, headers: NO_STORE });
    }
    return corsJson({ error: error instanceof Error ? error.message : "User import failed" }, { status: 400, headers: NO_STORE });
  }
}
