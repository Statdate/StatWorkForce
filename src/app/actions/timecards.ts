"use server";

import { revalidatePath } from "next/cache";
import { setTimeEntryApproval } from "@/lib/data/manager";

export async function approveTimeEntryAction(formData: FormData) {
  const timeEntryId = String(formData.get("timeEntryId"));
  const unitId = String(formData.get("unitId"));
  await setTimeEntryApproval(timeEntryId, "APPROVED");
  revalidatePath(`/manager/${unitId}`);
}

export async function rejectTimeEntryAction(formData: FormData) {
  const timeEntryId = String(formData.get("timeEntryId"));
  const unitId = String(formData.get("unitId"));
  await setTimeEntryApproval(timeEntryId, "REJECTED");
  revalidatePath(`/manager/${unitId}`);
}
