"use server";

import { revalidatePath } from "next/cache";
import { publishSchedulePeriod } from "@/lib/data/manager";

export async function publishSchedulePeriodAction(formData: FormData) {
  const schedulePeriodId = String(formData.get("schedulePeriodId"));
  const unitId = String(formData.get("unitId"));
  await publishSchedulePeriod(schedulePeriodId);
  revalidatePath(`/manager/${unitId}`);
}
