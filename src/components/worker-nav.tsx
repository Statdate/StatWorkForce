import Link from "next/link";

const TABS = [
  { href: "/worker", label: "My schedule" },
  { href: "/worker/credentials", label: "My credentials" },
  { href: "/worker/messages", label: "Messages" },
  { href: "/worker/notifications", label: "Notifications" },
] as const;

export function WorkerNav({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="flex gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-3 py-1 text-sm ${
            tab.href === active
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
