"use server";

import { revalidatePath } from "next/cache";
import { signUpForShift } from "@/lib/data/worker";

export async function signUpForShiftAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId"));
  await signUpForShift(shiftId);
  revalidatePath("/worker");
}
