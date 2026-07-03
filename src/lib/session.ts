import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { AccountType } from "@/generated/prisma/client";

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET environment variable is not set");
}
const encodedKey = new TextEncoder().encode(secretKey);

const SESSION_COOKIE = "swf_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours — long shared-computer shifts
const MOBILE_TOKEN_DURATION = "30d"; // personal device, not shared — safe to keep signed in longer

export type SessionPayload = {
  userId: string;
  accountType: AccountType;
  expiresAt: string;
};

export async function encrypt(payload: SessionPayload, expiresIn: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, accountType: AccountType) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt({ userId, accountType, expiresAt: expiresAt.toISOString() }, "12h");
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

/** Same signed-JWT format as the web session, just handed back in a JSON body
 * instead of an httpOnly cookie — the mobile app stores it itself (SecureStore)
 * and sends it back as `Authorization: Bearer <token>`. */
export async function createMobileToken(userId: string, accountType: AccountType) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return encrypt(
    { userId, accountType, expiresAt: expiresAt.toISOString() },
    MOBILE_TOKEN_DURATION
  );
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

/** Reads `Authorization: Bearer <token>` — the mobile equivalent of getSessionCookie(). */
export async function getBearerToken() {
  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  return authHeader.slice("Bearer ".length);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
