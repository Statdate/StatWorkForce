"use client";

import { useMemo, useState } from "react";

export type CalendarShift = {
  id: string;
  startTime: Date;
  endTime: Date;
  unitName: string;
  // Optional: lets callers tag a day (e.g. with the priority group that
  // requested it) without the calendar needing to know why.
  highlight?: { label: string; className: string } | null;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Month-grid calendar — plain client-side date math, no calendar library.
 * Shows one pill per shift on its day; clicking a shift-bearing day surfaces
 * its shifts below the grid instead of cramming detail into a tiny cell. */
export function ScheduleCalendar({ shifts }: { shifts: CalendarShift[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, CalendarShift[]>();
    for (const shift of shifts) {
      const key = dateKey(shift.startTime);
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
    return map;
  }, [shifts]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;

  const today = new Date();
  const todayKey = dateKey(today);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - leadingBlanks + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? new Date(year, month, dayNum) : null);
  }

  const selectedShifts = selectedKey ? (shiftsByDay.get(selectedKey) ?? []) : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setCursor(new Date(year, month - 1, 1));
            setSelectedKey(null);
          }}
          className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-slate-900">
          {firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => {
            setCursor(new Date(year, month + 1, 1));
            setSelectedKey(null);
          }}
          className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = dateKey(date);
          const dayShifts = shiftsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedKey(dayShifts.length > 0 ? key : null)}
              className={`flex min-h-16 flex-col items-start rounded-md border p-1 text-left text-xs ${
                isSelected
                  ? "border-slate-900 bg-slate-50"
                  : isToday
                    ? "border-slate-300 bg-amber-50"
                    : "border-slate-100"
              }`}
            >
              <span className={`font-medium ${isToday ? "text-amber-700" : "text-slate-600"}`}>
                {date.getDate()}
              </span>
              {dayShifts.map((shift) => (
                <span
                  key={shift.id}
                  className={`mt-0.5 w-full truncate rounded px-1 text-[10px] ${
                    shift.highlight?.className ?? "bg-slate-900 text-white"
                  }`}
                >
                  {shift.unitName}
                </span>
              ))}
            </button>
          );
        })}
      </div>

      {selectedShifts.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {selectedShifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-slate-900">{shift.unitName}</p>
                <p className="text-xs text-slate-500">
                  {shift.startTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} –{" "}
                  {shift.endTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              {shift.highlight && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${shift.highlight.className}`}>
                  {shift.highlight.label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
