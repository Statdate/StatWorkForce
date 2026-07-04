"use server";

import { revalidatePath } from "next/cache";
import { signUpForShift } from "@/lib/data/worker";
import { setShiftPickupApproval } from "@/lib/data/manager";
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

export async function approveShiftPickupAction(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId"));
  const unitId = String(formData.get("unitId"));
  try {
    await setShiftPickupApproval(assignmentId, "APPROVED");
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}

export async function rejectShiftPickupAction(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId"));
  const unitId = String(formData.get("unitId"));
  try {
    await setShiftPickupApproval(assignmentId, "DENIED");
  } catch (error) {
    redirectWithError(`/manager/${unitId}`, error);
  }
  revalidatePath(`/manager/${unitId}`);
}
