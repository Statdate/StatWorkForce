import { getApiUser } from "@/lib/dal";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  return corsJson({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    accountType: user.accountType,
    badgeNumber: user.badgeNumber,
    jobType: user.jobType,
    title: user.title,
    shiftPattern: user.shiftPattern,
    hospitalName: user.hospital.name,
    units: user.unitMemberships.map((m) => m.unit),
  });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
