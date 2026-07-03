import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

/**
 * Optimistic, cookie-only auth/role gate (Next.js 16 renamed `middleware` to
 * `proxy` — see AGENTS.md). This is NOT the source of truth for
 * authorization: every Server Component/Action/Route Handler re-verifies via
 * the DAL (src/lib/dal.ts) against the database. This just gives fast
 * redirects and keeps a worker from ever rendering an admin/manager shell.
 */
const ROLE_PREFIXES: Record<string, string> = {
  "/admin": "ADMIN",
  "/manager": "MANAGER",
  "/worker": "WORKER",
};

const PUBLIC_PATHS = ["/login", "/unauthorized"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("swf_session")?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (matchedPrefix && ROLE_PREFIXES[matchedPrefix] !== session.accountType) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
