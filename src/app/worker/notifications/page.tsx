import { getCurrentUser } from "@/lib/dal";
import { ensureCredentialExpiryNotifications, getMyNotifications } from "@/lib/data/notifications";
import { DashboardShell } from "@/components/dashboard-shell";
import { WorkerNav } from "@/components/worker-nav";

export default async function WorkerNotificationsPage() {
  await ensureCredentialExpiryNotifications();

  const [user, notifications] = await Promise.all([
    getCurrentUser(),
    getMyNotifications({ markRead: true }),
  ]);

  const nav = <WorkerNav active="/worker/notifications" />;

  return (
    <DashboardShell roleLabel="Worker" userName={`${user.firstName} ${user.lastName}`} nav={nav}>
      <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
      <p className="mt-1 text-sm text-slate-500">
        Credential expiration reminders arrive here (and in the mobile app) starting 2 months
        before a credential expires.
      </p>

      <div className="mt-6 space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border p-4 shadow-sm ${
              notification.readAt
                ? "border-slate-200 bg-white"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium text-slate-900">{notification.title}</p>
              {!notification.readAt && (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                  New
                </span>
              )}
            </div>
            {notification.body && <p className="mt-1 text-sm text-slate-600">{notification.body}</p>}
            <p className="mt-1 text-xs text-slate-400">
              {notification.sentAt.toLocaleDateString()}{" "}
              {notification.sentAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-slate-500">Nothing yet — you&apos;re all caught up.</p>
        )}
      </div>
    </DashboardShell>
  );
}
