import "server-only";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

// Brute-force lockout: N failed attempts against one badge number within a
// window locks that badge out for a cooldown period. In-memory and
// per-process — fine for this deploy (Render's free-tier web service is a
// single long-running instance), but would need a shared store (e.g. Redis)
// before scaling to multiple instances, and it resets on every deploy/restart.
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

type AttemptRecord = { count: number; windowStartedAt: number; lockedUntil: number | null };
const loginAttempts = new Map<string, AttemptRecord>();

// A fixed, valid bcrypt hash (of an arbitrary string, salt rounds matching
// src/lib/password.ts) that never matches any real password — used so a
// lookup for a non-existent badge number still pays the bcrypt cost below.
const DUMMY_HASH = "$2b$12$79i11urWWSWUuWNU7fxgZu3t5hslfqIMSJY0mZpOChPaTF461UNt2";

function attemptKey(badgeNumber: string) {
  return badgeNumber.trim().toLowerCase();
}

function secondsUntil(timestamp: number) {
  return Math.max(1, Math.ceil((timestamp - Date.now()) / 1000));
}

export type AuthResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof prisma.user.findFirst>>> }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; retryAfterSeconds: number };

/**
 * Badge numbers are unique per-hospital, not globally. This scaffold
 * resolves login by badge number alone (single-tenant assumption) — see
 * README "Decisions needed" for the multi-hospital login question.
 */
export async function authenticateUser(badgeNumber: string, password: string): Promise<AuthResult> {
  const key = attemptKey(badgeNumber);
  const existing = loginAttempts.get(key);
  if (existing?.lockedUntil && existing.lockedUntil > Date.now()) {
    return { ok: false, reason: "locked", retryAfterSeconds: secondsUntil(existing.lockedUntil) };
  }

  const user = await prisma.user.findFirst({
    where: { badgeNumber, isActive: true },
  });
  // Always run the bcrypt compare, even for a badge number that doesn't
  // exist — against a fixed dummy hash so a non-existent badge takes the
  // same time as a wrong password, instead of returning near-instantly and
  // letting an attacker enumerate valid badge numbers by response time.
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    const now = Date.now();
    const record =
      existing && now - existing.windowStartedAt < ATTEMPT_WINDOW_MS
        ? existing
        : { count: 0, windowStartedAt: now, lockedUntil: null };
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) record.lockedUntil = now + LOCKOUT_MS;
    loginAttempts.set(key, record);
    return { ok: false, reason: "invalid" };
  }

  loginAttempts.delete(key);
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
