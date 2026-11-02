import { processPendingPushNotifications } from "@/lib/push";

/** Frequent outbox drain. Uses the same machine credential as the daily
 * credential sweep; no user session or hospital data is accepted as input. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!secret || provided !== secret) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  const deliveriesProcessed = await processPendingPushNotifications();
  return Response.json({ ok: true, deliveriesProcessed });
}
