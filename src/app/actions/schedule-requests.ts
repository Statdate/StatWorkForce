"use server";

import { revalidatePath } from "next/cache";
import { submitMyScheduleRequest } from "@/lib/data/worker";
import { createScheduleRequestWindow, setScheduleRequestWindow } from "@/lib/data/manager";
import { redirectWithError } from "@/lib/action-error";

export async function submitScheduleRequestAction(formData: FormData) {
  const schedulePeriodId = String(formData.get("schedulePeriodId"));
  const requestedDates = String(formData.get("requestedDates") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  const note = formData.get("note")?.toString() ?? null;

  try {
    await submitMyScheduleRequest({ schedulePeriodId, requestedDates, note });
  } catch (error) {
    redirectWithError("/worker", error);
  }
  revalidatePath("/worker");
}

export async function createScheduleRequestWindowAction(formData: FormData) {
  const unitId = String(formData.get("unitId"));
  const startDate = String(formData.get("startDate"));
  try {
    await createScheduleRequestWindow(unitId, startDate);
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}

export async function closeScheduleRequestWindowAction(formData: FormData) {
  const unitId = String(formData.get("unitId"));
  const schedulePeriodId = String(formData.get("schedulePeriodId"));
  try {
    await setScheduleRequestWindow(schedulePeriodId, false);
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}
