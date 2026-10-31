"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getPasswordChangeUser } from "@/lib/dal";
import { hashPassword, verifyPassword } from "@/lib/password";
import { InitialPasswordChangeSchema } from "@/lib/validation/password";
import { recordAuditEvent } from "@/lib/audit";
import { createSession } from "@/lib/session";
import { dashboardPathFor } from "@/lib/auth";
import { redirectWithError } from "@/lib/action-error";

export async function changeInitialPasswordAction(formData: FormData) {
  const user = await getPasswordChangeUser();
  if (!user.mustChangePassword) redirect(dashboardPathFor(user.accountType));
  const parsed = InitialPasswordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) redirectWithError("/change-password", new Error(parsed.error.issues[0]?.message));

  const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!stored || !(await verifyPassword(parsed.data.currentPassword, stored.passwordHash))) {
    redirectWithError("/change-password", new Error("The temporary password is incorrect"));
  }
  const passwordHash = await hashPassword(parsed.data.newPassword);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    await recordAuditEvent({ hospitalId: user.hospitalId, actorId: user.id, action: "INITIAL_PASSWORD_CHANGED", resourceType: "User", resourceId: user.id }, tx);
    return result;
  });
  await createSession(user.id, user.accountType, updated.sessionVersion, false);
  redirect(dashboardPathFor(user.accountType));
}

export async function changeOwnPasswordAction(formData: FormData) {
  const user = await getCurrentUser();
  const parsed = InitialPasswordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    redirectWithError("/account/security", new Error(parsed.error.issues[0]?.message));
  }
  const stored = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!stored || !(await verifyPassword(parsed.data.currentPassword, stored.passwordHash))) {
    redirectWithError("/account/security", new Error("The current password is incorrect"));
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    await recordAuditEvent(
      {
        hospitalId: user.hospitalId,
        actorId: user.id,
        action: "USER_PASSWORD_CHANGED",
        resourceType: "User",
        resourceId: user.id,
      },
      tx
    );
    return result;
  });
  await createSession(user.id, user.accountType, updated.sessionVersion, false);
  redirect("/account/security?changed=true");
}
