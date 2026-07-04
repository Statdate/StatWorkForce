"use server";

import { revalidatePath } from "next/cache";
import { requestMyTimeOff, withdrawMyTimeOffRequest } from "@/lib/data/worker";
import { reviewTimeOffRequest } from "@/lib/data/manager";
import { redirectWithError } from "@/lib/action-error";

export async function requestTimeOffAction(formData: FormData) {
  try {
    await requestMyTimeOff({
      type: String(formData.get("type")),
      startDate: String(formData.get("startDate")),
      endDate: String(formData.get("endDate")),
      hours: Number(formData.get("hours")),
      reason: formData.get("reason")?.toString() ?? null,
    });
  } catch (error) {
    redirectWithError("/worker/time-off", error);
  }
  revalidatePath("/worker/time-off");
}

export async function withdrawTimeOffRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId"));
  try {
    await withdrawMyTimeOffRequest(requestId);
  } catch (error) {
    redirectWithError("/worker/time-off", error);
  }
  revalidatePath("/worker/time-off");
}

export async function reviewTimeOffRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId"));
  const unitId = String(formData.get("unitId"));
  const decision = String(formData.get("decision"));
  try {
    if (decision !== "APPROVED" && decision !== "DENIED") {
      throw new Error("Invalid decision");
    }
    await reviewTimeOffRequest(requestId, decision);
  } catch (error) {
    redirectWithError(`/manager/${unitId}/time-off`, error);
  }
  revalidatePath(`/manager/${unitId}/time-off`);
}
