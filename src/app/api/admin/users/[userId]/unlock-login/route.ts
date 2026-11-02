import { getApiUser } from "@/lib/dal";
import { unlockHospitalUserLogin } from "@/lib/data/admin";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getApiUser();
  if (!user) return corsJson({ error: "Not authenticated" }, { status: 401 });
  if (user.accountType !== "ADMIN") {
    return corsJson({ error: "Only administrators can unlock accounts" }, { status: 403 });
  }
  try {
    const { userId } = await params;
    await unlockHospitalUserLogin(userId);
    return corsJson({ ok: true });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Could not unlock account" },
      { status: 404 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
