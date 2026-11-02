import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// Brute-force lockout: N failed attempts against one hospital-qualified badge
// within a window locks it for a cooldown. State is database-backed so it is
// shared across instances and survives restarts/deploys.
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

// A fixed, valid bcrypt hash (of an arbitrary string, salt rounds matching
// src/lib/password.ts) that never matches any real password — used so a
// lookup for a non-existent badge number still pays the bcrypt cost below.
const DUMMY_HASH = "$2b$12$79i11urWWSWUuWNU7fxgZu3t5hslfqIMSJY0mZpOChPaTF461UNt2";

export function loginAttemptKeyHash(organizationCode: string, badgeNumber: string) {
  const normalized = `${organizationCode.trim().toLowerCase()}:${badgeNumber.trim().toLowerCase()}`;
  return createHash("sha256").update(normalized).digest("hex");
}

function secondsUntil(timestamp: number) {
  return Math.max(1, Math.ceil((timestamp - Date.now()) / 1000));
}

export type AuthResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof prisma.user.findFirst>>> }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; retryAfterSeconds: number };

/** Badge numbers are unique per hospital. The organization code is mandatory
 * so an identity can never be resolved by scanning across tenants. */
export async function authenticateUser(
  organizationCode: string,
  badgeNumber: string,
  password: string
): Promise<AuthResult> {
  const keyHash = loginAttemptKeyHash(organizationCode, badgeNumber);
  const existing = await prisma.loginThrottle.findUnique({ where: { keyHash } });
  if (existing?.lockedUntil && existing.lockedUntil.getTime() > Date.now()) {
    return {
      ok: false,
      reason: "locked",
      retryAfterSeconds: secondsUntil(existing.lockedUntil.getTime()),
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      badgeNumber,
      isActive: true,
      hospital: { code: organizationCode.trim().toLowerCase() },
    },
  });
  // Always run the bcrypt compare, even for a badge number that doesn't
  // exist — against a fixed dummy hash so a non-existent badge takes the
  // same time as a wrong password, instead of returning near-instantly and
  // letting an attacker enumerate valid badge numbers by response time.
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    const now = Date.now();
    const withinWindow =
      existing && now - existing.windowStartedAt.getTime() < ATTEMPT_WINDOW_MS;
    const failedCount = (withinWindow ? existing.failedCount : 0) + 1;
    const windowStartedAt = withinWindow ? existing.windowStartedAt : new Date(now);
    const lockedUntil = failedCount >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS) : null;
    await prisma.loginThrottle.upsert({
      where: { keyHash },
      update: { failedCount, windowStartedAt, lockedUntil },
      create: { keyHash, failedCount, windowStartedAt, lockedUntil },
    });
    return { ok: false, reason: "invalid" };
  }

  await prisma.loginThrottle.deleteMany({ where: { keyHash } });
  return { ok: true, user };
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
