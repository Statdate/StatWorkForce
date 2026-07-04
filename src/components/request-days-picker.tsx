"use client";

import { useState } from "react";
import { submitScheduleRequestAction } from "@/app/actions/schedule-requests";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Lets a worker tap days on a month grid to build up the requested-dates
 * list for an open schedule-request window — distinct from ScheduleCalendar
 * (which only displays existing shifts), since this one needs to manage a
 * multi-select interaction instead. */
export function RequestDaysPicker({
  schedulePeriodId,
  startDate,
  endDate,
  initialDates,
  initialNote,
}: {
  schedulePeriodId: string;
  startDate: Date;
  endDate: Date;
  initialDates: string[];
  initialNote: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialDates));
  const [note, setNote] = useState(initialNote);
  const [cursor, setCursor] = useState(() => new Date(startDate.getFullYear(), startDate.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - leadingBlanks + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? new Date(year, month, dayNum) : null);
  }

  function toggle(date: Date) {
    if (date < startDate || date > endDate) return;
    const key = dateKey(date);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const sortedSelected = [...selected].sort();

  return (
    <form action={submitScheduleRequestAction} className="space-y-3">
      <input type="hidden" name="schedulePeriodId" value={schedulePeriodId} />
      <input type="hidden" name="requestedDates" value={sortedSelected.join(",")} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-slate-900">
          {firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = dateKey(date);
          const inRange = date >= startDate && date <= endDate;
          const isSelected = selected.has(key);
          return (
            <button
              type="button"
              key={key}
              disabled={!inRange}
              onClick={() => toggle(date)}
              className={`rounded-md border p-2 text-xs ${
                !inRange
                  ? "cursor-not-allowed border-transparent text-slate-300"
                  : isSelected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <label className="block text-sm">
        <span className="text-slate-700">Note (optional)</span>
        <input
          type="text"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. prefer day shifts, can't work weekends"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={selected.size === 0}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Submit requested days
        </button>
        <p className="text-xs text-slate-400">{selected.size} day(s) selected</p>
      </div>
    </form>
  );
}
