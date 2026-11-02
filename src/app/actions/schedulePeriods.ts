"use server";

import { revalidatePath } from "next/cache";
import {
  createShift,
  deleteDraftShift,
  publishSchedulePeriod,
  updateDraftShift,
} from "@/lib/data/manager";
import { redirectWithError } from "@/lib/action-error";

export async function publishSchedulePeriodAction(formData: FormData) {
  const schedulePeriodId = String(formData.get("schedulePeriodId"));
  const unitId = String(formData.get("unitId"));
  try {
    await publishSchedulePeriod(schedulePeriodId);
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}

export async function createShiftAction(formData: FormData) {
  const unitId = String(formData.get("unitId"));
  try {
    await createShift({
      unitId,
      schedulePeriodId: String(formData.get("schedulePeriodId")),
      jobTypeId: String(formData.get("jobTypeId")),
      startLocal: String(formData.get("startLocal")),
      endLocal: String(formData.get("endLocal")),
      requiredCount: Number(formData.get("requiredCount")),
      notes: String(formData.get("notes") ?? ""),
    });
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}

export async function updateDraftShiftAction(formData: FormData) {
  const unitId = String(formData.get("unitId"));
  try {
    await updateDraftShift({
      shiftId: String(formData.get("shiftId")),
      unitId,
      jobTypeId: String(formData.get("jobTypeId")),
      startLocal: String(formData.get("startLocal")),
      endLocal: String(formData.get("endLocal")),
      requiredCount: Number(formData.get("requiredCount")),
      notes: String(formData.get("notes") ?? ""),
    });
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}

export async function deleteDraftShiftAction(formData: FormData) {
  const unitId = String(formData.get("unitId"));
  try {
    await deleteDraftShift(String(formData.get("shiftId")), unitId);
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}
