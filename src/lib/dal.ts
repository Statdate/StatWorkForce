import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionCookie, getBearerToken, decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { AccountType } from "@/generated/prisma/client";

/**
 * Optimistic-vs-secure split per Next.js auth guidance: proxy.ts does a
 * cookie-only check for fast redirects; verifySession()/getCurrentUser() here
 * do the real, DB-backed authorization check that every Server
 * Component/Action/Route Handler must call before touching data.
 *
 * Accepts either the web session cookie or a mobile `Authorization: Bearer`
 * token — same signed JWT format either way (see src/lib/session.ts).
 */
export const verifySession = cache(async () => {
  const cookie = (await getBearerToken()) ?? (await getSessionCookie());
  const session = await decrypt(cookie);

  if (!session?.userId) {
    redirect("/login");
  }

  return { userId: session.userId, accountType: session.accountType };
});

const CURRENT_USER_SELECT = {
  id: true,
  hospitalId: true,
  accountType: true,
  badgeNumber: true,
  firstName: true,
  lastName: true,
  email: true,
  isActive: true,
  hospital: { select: { name: true } },
  jobType: { select: { id: true, name: true } },
  unitMemberships: {
    select: {
      unitId: true,
      isPrimary: true,
      priorityGroupId: true,
      unit: { select: { id: true, name: true, type: true } },
    },
  },
  superuserAssignments: {
    select: { unitId: true, permissions: true },
  },
} as const;

export const getCurrentUser = cache(async () => {
  const session = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: CURRENT_USER_SELECT,
  });

  if (!user || !user.isActive) {
    redirect("/login");
  }

  return user;
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

/** Redirects away if the current user's accountType isn't one of `allowed`. */
export async function requireRole(...allowed: AccountType[]) {
  const user = await getCurrentUser();
  if (!allowed.includes(user.accountType)) {
    redirect("/unauthorized");
  }
  return user;
}

/** Unit IDs a manager/worker is scoped to. Admins get null (unscoped = all units). */
export function scopedUnitIds(user: CurrentUser): string[] | null {
  if (user.accountType === "ADMIN") return null;
  return user.unitMemberships.map((m) => m.unitId);
}

/**
 * Route Handler variant of getCurrentUser(): returns null instead of
 * redirecting. A 302 to /login makes no sense as a JSON API response — the
 * mobile app needs a 401 it can branch on, not an HTML redirect.
 */
export const getApiUser = cache(async () => {
  const cookie = (await getBearerToken()) ?? (await getSessionCookie());
  const session = await decrypt(cookie);
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: CURRENT_USER_SELECT,
  });

  if (!user || !user.isActive) return null;
  return user;
});
