"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { LoginFormSchema, type LoginFormState } from "@/lib/validation/auth";
import type { AccountType } from "@/generated/prisma/client";

function dashboardPathFor(accountType: AccountType) {
  switch (accountType) {
    case "ADMIN":
      return "/admin";
    case "MANAGER":
      return "/manager";
    case "WORKER":
      return "/worker";
  }
}

export async function login(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const validatedFields = LoginFormSchema.safeParse({
    badgeNumber: formData.get("badgeNumber"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { badgeNumber, password } = validatedFields.data;

  // Badge numbers are unique per-hospital, not globally. This scaffold
  // resolves login by badge number alone (single-tenant assumption) — see
  // README "Decisions needed" for the multi-hospital login question.
  const user = await prisma.user.findFirst({
    where: { badgeNumber, isActive: true },
  });

  if (!user) {
    return { message: "Invalid badge number or password." };
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return { message: "Invalid badge number or password." };
  }

  await createSession(user.id, user.accountType);
  redirect(dashboardPathFor(user.accountType));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
