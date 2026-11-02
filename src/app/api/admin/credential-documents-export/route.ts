import { getApiUser } from "@/lib/dal";
import {
  CredentialExportLimitError,
  getHospitalCredentialDocumentExport,
} from "@/lib/data/credential-export";
import { corsJson } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") {
    return corsJson({ error: "Only administrators can export credential documents" }, { status: 403 });
  }
  try {
    const result = await getHospitalCredentialDocumentExport(user);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(result.archive), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="statworkforce-credential-documents-${date}.zip"`,
        "Cache-Control": "private, no-store",
        "X-Document-Count": String(result.documentCount),
      },
    });
  } catch (error) {
    if (error instanceof CredentialExportLimitError) {
      return corsJson(
        { error: "This credential export requires the managed offline export process", reason: error.reason },
        { status: 413 }
      );
    }
    throw error;
  }
}
