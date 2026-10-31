import { getApiUser } from "@/lib/dal";
import { DataExportTooLargeError, getHospitalDataExport } from "@/lib/data/export";
import { corsJson } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") {
    return corsJson({ error: "Only administrators can export hospital data" }, { status: 403 });
  }

  try {
    const payload = await getHospitalDataExport(user);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="statworkforce-hospital-export-${date}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DataExportTooLargeError) {
      return corsJson(
        { error: "This export requires the managed offline export process", recordCount: error.recordCount },
        { status: 413 }
      );
    }
    throw error;
  }
}
