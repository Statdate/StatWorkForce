import "server-only";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

/**
 * Badge numbers are unique per-hospital, not globally. This scaffold
 * resolves login by badge number alone (single-tenant assumption) — see
 * README "Decisions needed" for the multi-hospital login question.
 */
export async function authenticateUser(badgeNumber: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { badgeNumber, isActive: true },
  });
  if (!user) return null;

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) return null;

  return user;
}

export function dashboardPathFor(accountType: "ADMIN" | "MANAGER" | "WORKER") {
  switch (accountType) {
    case "ADMIN":
      return "/admin";
    case "MANAGER":
      return "/manager";
    case "WORKER":
      return "/worker";
  }
}
