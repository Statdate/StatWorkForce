import Link from "next/link";

const items = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "credentials", label: "Credentials", href: "/admin/credentials" },
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "delivery", label: "Delivery", href: "/admin/delivery" },
  { key: "health", label: "Operational health", href: "/admin/health" },
  { key: "settings", label: "Settings", href: "/admin/settings" },
  { key: "audit", label: "Audit log", href: "/admin/audit" },
] as const;

export function AdminNav({ active }: { active: (typeof items)[number]["key"] }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {items.map((item) =>
        item.key === active ? (
          <span key={item.key} className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white">
            {item.label}
          </span>
        ) : (
          <Link
            key={item.key}
            href={item.href}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
          >
            {item.label}
          </Link>
        )
      )}
    </div>
  );
}
