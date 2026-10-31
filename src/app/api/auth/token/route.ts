import { authenticateUser } from "@/lib/auth";
import { createMobileToken } from "@/lib/session";
import { corsJson, corsOptionsResponse } from "@/lib/cors";
import { LoginFormSchema } from "@/lib/validation/auth";
import { recordAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validatedFields = LoginFormSchema.safeParse(body);

  if (!validatedFields.success) {
    return corsJson({ error: "Organization code, badge number, and password are required." }, { status: 400 });
  }

  const { organizationCode, badgeNumber, password } = validatedFields.data;
  const result = await authenticateUser(organizationCode, badgeNumber, password);

  if (!result.ok) {
    if (result.reason === "locked") {
      return corsJson(
        { error: "Too many failed attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }
    return corsJson({ error: "Invalid badge number or password." }, { status: 401 });
  }

  const { user } = result;
  if (user.mustChangePassword) {
    return corsJson(
      { error: "Complete your initial password change in the Stat Workforce web app before signing in on mobile." },
      { status: 403 }
    );
  }
  const token = await createMobileToken(user.id, user.accountType, user.sessionVersion);
  await recordAuditEvent({
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: "AUTH_LOGIN_MOBILE",
    resourceType: "User",
    resourceId: user.id,
  });

  return corsJson({
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType,
    },
  });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
