"use server";

import { revalidatePath } from "next/cache";
import { signUpForShift, dropShift } from "@/lib/data/worker";

export async function signUpForShiftAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId"));
  await signUpForShift(shiftId);
  revalidatePath("/worker");
}

export async function dropShiftAction(formData: FormData) {
  const shiftId = String(formData.get("shiftId"));
  await dropShift(shiftId);
  revalidatePath("/worker");
}
