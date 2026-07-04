import Link from "next/link";

const TABS = [
  { key: "dashboard", label: "Dashboard", path: "" },
  { key: "credentials", label: "Credentials", path: "/credentials" },
  { key: "time-off", label: "Time off", path: "/time-off" },
  { key: "messages", label: "Messages", path: "/messages" },
  { key: "alerts", label: "Alerts", path: "/alerts" },
] as const;

/** Shared nav row for every /manager/[unitId]/* page. Pulled out so every
 * sub-page (credentials, time off, messages, alerts) links to the others —
 * the messages pages previously rendered no nav at all, leaving a manager
 * stuck there with no way back to Credentials or anywhere else. */
export function ManagerNav({
  unitId,
  active,
}: {
  unitId: string;
  active: (typeof TABS)[number]["key"];
}) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return isActive ? (
          <span
            key={tab.key}
            className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.key}
            href={`/manager/${unitId}${tab.path}`}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
