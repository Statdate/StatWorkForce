"use server";

import { revalidatePath } from "next/cache";
import { publishSchedulePeriod } from "@/lib/data/manager";
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
