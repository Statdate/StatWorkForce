"use server";

import { revalidatePath } from "next/cache";
import { requestMyTimeOff, withdrawMyTimeOffRequest } from "@/lib/data/worker";
import { reviewTimeOffRequest } from "@/lib/data/manager";

export async function requestTimeOffAction(formData: FormData) {
  await requestMyTimeOff({
    type: String(formData.get("type")),
    startDate: String(formData.get("startDate")),
    endDate: String(formData.get("endDate")),
    hours: Number(formData.get("hours")),
    reason: formData.get("reason")?.toString() ?? null,
  });
  revalidatePath("/worker/time-off");
}

export async function withdrawTimeOffRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId"));
  await withdrawMyTimeOffRequest(requestId);
  revalidatePath("/worker/time-off");
}

export async function reviewTimeOffRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId"));
  const unitId = String(formData.get("unitId"));
  const decision = String(formData.get("decision"));
  if (decision !== "APPROVED" && decision !== "DENIED") {
    throw new Error("Invalid decision");
  }
  await reviewTimeOffRequest(requestId, decision);
  revalidatePath(`/manager/${unitId}/time-off`);
}
