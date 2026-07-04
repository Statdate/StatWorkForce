"use client";

import { useState } from "react";
import { requestTimeOffAction } from "@/app/actions/timeoff";
import { TIME_OFF_TYPE_OPTIONS, TIME_OFF_HOURS_OPTIONS, reasonRequiredFor } from "@/lib/timeoff-types";
import type { TimeOffType } from "@/generated/prisma/client";

export function TimeOffRequestForm() {
  const [type, setType] = useState<TimeOffType | "">("");
  const commentRequired = type !== "" && reasonRequiredFor(type);

  return (
    <form action={requestTimeOffAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="text-slate-700">Type</span>
        <select
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value as TimeOffType)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Choose a type…
          </option>
          {TIME_OFF_TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">Hours requested</span>
        <select
          name="hours"
          required
          defaultValue="8"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {TIME_OFF_HOURS_OPTIONS.map((hours) => (
            <option key={hours} value={hours}>
              {hours} hours{hours === 8 ? " (full shift)" : ""}
              {hours === 24 ? " (full day)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">Start date</span>
        <input
          type="date"
          name="startDate"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-700">End date</span>
        <input
          type="date"
          name="endDate"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="text-slate-700">
          {commentRequired ? "Comment (required for Other)" : "Reason (optional)"}
        </span>
        <textarea
          name="reason"
          required={commentRequired}
          rows={commentRequired ? 3 : 1}
          placeholder={commentRequired ? "Describe the reason for this request…" : undefined}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Submit request
        </button>
      </div>
    </form>
  );
}
