"use server";

import { redirect } from "next/navigation";
import { authenticateUser, dashboardPathFor } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import { LoginFormSchema, type LoginFormState } from "@/lib/validation/auth";
import { recordAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/dal";

export async function login(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const validatedFields = LoginFormSchema.safeParse({
    organizationCode: formData.get("organizationCode"),
    badgeNumber: formData.get("badgeNumber"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { organizationCode, badgeNumber, password } = validatedFields.data;
  const result = await authenticateUser(organizationCode, badgeNumber, password);

  if (!result.ok) {
    if (result.reason === "locked") {
      const minutes = Math.ceil(result.retryAfterSeconds / 60);
      return { message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
    }
    return { message: "Invalid badge number or password." };
  }

  await recordAuditEvent({
    hospitalId: result.user.hospitalId,
    actorId: result.user.id,
    action: "AUTH_LOGIN_WEB",
    resourceType: "User",
    resourceId: result.user.id,
  });
  await createSession(
    result.user.id,
    result.user.accountType,
    result.user.sessionVersion,
    result.user.mustChangePassword
  );
  if (result.user.mustChangePassword) redirect("/change-password");
  redirect(dashboardPathFor(result.user.accountType));
}

export async function logout() {
  const user = await getCurrentUser();
  await recordAuditEvent({
    hospitalId: user.hospitalId,
    actorId: user.id,
    action: "AUTH_LOGOUT_WEB",
    resourceType: "User",
    resourceId: user.id,
  });
  await deleteSession();
  redirect("/login");
}
