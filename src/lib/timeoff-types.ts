import type { TimeOffType, TimeOffRequestStatus } from "@/generated/prisma/client";

export const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  SICK: "Sick",
  VACATION: "Vacation",
  LIFE_BALANCE: "Life Balance",
};

export const TIME_OFF_TYPE_OPTIONS = Object.entries(TIME_OFF_TYPE_LABELS) as [
  TimeOffType,
  string,
][];

export function timeOffStatusStyle(status: TimeOffRequestStatus) {
  if (status === "APPROVED") return { label: "Approved", className: "bg-emerald-100 text-emerald-700" };
  if (status === "DENIED") return { label: "Denied", className: "bg-red-100 text-red-700" };
  return { label: "Pending", className: "bg-amber-100 text-amber-700" };
}
