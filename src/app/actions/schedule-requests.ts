"use server";

import { revalidatePath } from "next/cache";
import { submitMyScheduleRequest } from "@/lib/data/worker";
import { createScheduleRequestWindow, setScheduleRequestWindow } from "@/lib/data/manager";

export async function submitScheduleRequestAction(formData: FormData) {
  const schedulePeriodId = String(formData.get("schedulePeriodId"));
  const requestedDates = String(formData.get("requestedDates") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  const note = formData.get("note")?.toString() ?? null;

  await submitMyScheduleRequest({ schedulePeriodId, requestedDates, note });
  revalidatePath("/worker");
}

export async function createScheduleRequestWindowAction(formData: FormData) {
  const unitId = String(formData.get("unitId"));
  const startDate = String(formData.get("startDate"));
  await createScheduleRequestWindow(unitId, startDate);
  revalidatePath(`/manager/${unitId}`);
}

export async function closeScheduleRequestWindowAction(formData: FormData) {
  const unitId = String(formData.get("unitId"));
  const schedulePeriodId = String(formData.get("schedulePeriodId"));
  await setScheduleRequestWindow(schedulePeriodId, false);
  revalidatePath(`/manager/${unitId}`);
}
