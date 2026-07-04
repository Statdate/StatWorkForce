"use server";

import { revalidatePath } from "next/cache";
import { signUpForShift } from "@/lib/data/worker";
import { redirectWithError } from "@/lib/action-error";

export async function signUpForShiftAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId"));
  try {
    await signUpForShift(shiftId);
  } catch (error) {
    redirectWithError("/worker", error);
  }
  revalidatePath("/worker");
}
