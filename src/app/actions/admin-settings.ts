"use server";

import { revalidatePath } from "next/cache";
import { redirectWithError } from "@/lib/action-error";
import {
  createHospitalJobType,
  createHospitalUnit,
  updateHospitalUnit,
  updateHospitalSchedulingPolicy,
  updateJobTypeCredentialRequirements,
} from "@/lib/data/admin";

export async function createHospitalJobTypeAction(formData: FormData) {
  try {
    await createHospitalJobType({ name: formData.get("name"), category: formData.get("category") });
  } catch (error) {
    redirectWithError("/admin/settings", error);
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
}

export async function createHospitalUnitAction(formData: FormData) {
  try {
    await createHospitalUnit({ name: formData.get("name"), type: formData.get("type") });
  } catch (error) {
    redirectWithError("/admin/settings", error);
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
}

export async function updateHospitalUnitAction(formData: FormData) {
  const unitId = formData.get("unitId");
  if (typeof unitId !== "string") redirectWithError("/admin/settings", new Error("Invalid unit"));
  try {
    await updateHospitalUnit(unitId, { name: formData.get("name"), type: formData.get("type") });
  } catch (error) {
    redirectWithError("/admin/settings", error);
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
}

export async function updateJobTypeCredentialRequirementsAction(formData: FormData) {
  const jobTypeId = formData.get("jobTypeId");
  if (typeof jobTypeId !== "string") {
    redirectWithError("/admin/settings", new Error("Invalid job type"));
  }
  try {
    await updateJobTypeCredentialRequirements(jobTypeId, formData.getAll("credentialTypes"));
  } catch (error) {
    redirectWithError("/admin/settings", error);
  }
  revalidatePath("/admin/settings");
}

export async function updateHospitalSchedulingPolicyAction(formData: FormData) {
  try {
    await updateHospitalSchedulingPolicy({
      timeZone: formData.get("timeZone"),
      weekStartsOn: formData.get("weekStartsOn"),
      weeklyHoursWarning: formData.get("weeklyHoursWarning"),
    });
  } catch (error) {
    redirectWithError("/admin/settings", error);
  }
  revalidatePath("/admin/settings");
}
