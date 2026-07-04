"use server";

import { revalidatePath } from "next/cache";
import { setTimeEntryApproval } from "@/lib/data/manager";
import { redirectWithError } from "@/lib/action-error";

export async function approveTimeEntryAction(formData: FormData) {
  const timeEntryId = String(formData.get("timeEntryId"));
  const unitId = String(formData.get("unitId"));
  try {
    await setTimeEntryApproval(timeEntryId, "APPROVED");
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}

export async function rejectTimeEntryAction(formData: FormData) {
  const timeEntryId = String(formData.get("timeEntryId"));
  const unitId = String(formData.get("unitId"));
  try {
    await setTimeEntryApproval(timeEntryId, "REJECTED");
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}
