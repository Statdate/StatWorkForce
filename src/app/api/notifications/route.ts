import { getApiUser } from "@/lib/dal";
import {
  ensureCredentialExpiryNotifications,
  getNotificationsForUser,
} from "@/lib/data/notifications";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

/** List the caller's notifications, generating any newly-due credential
 * expiry reminders first so the mobile app never shows a stale empty list.
 * `?markRead=1` marks everything read after fetching (the list still returns
 * pre-read state so the app can style unread rows). */
export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  await ensureCredentialExpiryNotifications();

  const markRead = new URL(request.url).searchParams.get("markRead") === "1";
  const notifications = await getNotificationsForUser(user.id, { markRead });
  return corsJson({ notifications });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
