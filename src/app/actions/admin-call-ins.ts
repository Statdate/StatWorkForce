"use server";

import { revalidatePath } from "next/cache";
import { redirectWithError } from "@/lib/action-error";
import { resolveHospitalCallIn } from "@/lib/data/admin";

export async function resolveHospitalCallInAction(formData: FormData) {
  const callInId = formData.get("callInId");
  if (typeof callInId !== "string") redirectWithError("/admin", new Error("Invalid call-in"));
  try {
    await resolveHospitalCallIn(callInId, {
      status: formData.get("status"),
      notes: formData.get("notes"),
    });
  } catch (error) {
    redirectWithError("/admin", error);
  }
  revalidatePath("/admin");
}
