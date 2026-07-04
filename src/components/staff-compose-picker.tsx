"use client";

import { useState } from "react";
import Link from "next/link";

export type ComposeStaffEntry = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  badgeNumber: string;
  unitId: string;
  unitName: string;
};

/** "Compose" entry point for the manager Messages page — opens a searchable
 * list of every worker across the manager's units (not just the unit in the
 * current URL) and routes to that worker's own message thread. */
export function StaffComposePicker({ staff }: { staff: ComposeStaffEntry[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Compose
      </button>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? staff.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          s.badgeNumber.includes(q) ||
          s.unitName.toLowerCase().includes(q)
      )
    : staff;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search staff by name, badge, or unit..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setQuery("");
          }}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          Cancel
        </button>
      </div>
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {filtered.map((s) => (
          <Link
            key={s.id}
            href={`/manager/${s.unitId}/messages/${s.id}`}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100"
          >
            <span className="text-slate-900">
              {s.firstName} {s.lastName}
              {s.title && <span className="ml-2 text-xs text-slate-400">{s.title}</span>}
            </span>
            <span className="text-xs text-slate-400">
              {s.unitName} · #{s.badgeNumber}
            </span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-2 text-sm text-slate-500">No staff match your search.</p>
        )}
      </div>
    </div>
  );
}
