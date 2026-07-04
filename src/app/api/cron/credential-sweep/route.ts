import { prisma } from "@/lib/prisma";
import { ensureCredentialExpiryNotifications } from "@/lib/data/notifications";

/**
 * Daily trigger for the credential-expiry sweep. Render's free tier has no
 * built-in scheduler, so this is called by a GitHub Actions scheduled
 * workflow instead (see .github/workflows/credential-sweep.yml) — a plain
 * authenticated POST, not tied to any Render-specific feature. Protected by a
 * shared secret (CRON_SECRET) rather than session auth since the caller is a
 * machine, not a logged-in user.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!secret || provided !== secret) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const before = await prisma.notification.count();
  await ensureCredentialExpiryNotifications();
  const after = await prisma.notification.count();

  return Response.json({ ok: true, notificationsCreated: after - before });
}
