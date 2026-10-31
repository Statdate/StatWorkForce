"use server";

import { revalidatePath } from "next/cache";
import {
  createHospitalUser,
  resetHospitalUserPassword,
  revokeAllSessionsForUser,
  setUserActiveState,
  updateHospitalUserAccess,
  unlockHospitalUserLogin,
} from "@/lib/data/admin";
import { redirectWithError } from "@/lib/action-error";

export async function createHospitalUserAction(formData: FormData) {
  try {
    await createHospitalUser({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      badgeNumber: formData.get("badgeNumber"),
      email: formData.get("email"),
      accountType: formData.get("accountType"),
      jobTypeId: formData.get("jobTypeId"),
      temporaryPassword: formData.get("temporaryPassword"),
      unitIds: formData.getAll("unitIds"),
    });
  } catch (error) {
    redirectWithError("/admin/users", error);
  }
  revalidatePath("/admin/users");
}

export async function setUserActiveStateAction(formData: FormData) {
  const userId = formData.get("userId");
  const active = formData.get("active");
  if (typeof userId !== "string" || (active !== "true" && active !== "false")) {
    throw new Error("Invalid user update");
  }
  await setUserActiveState(userId, active === "true");
  revalidatePath("/admin/users");
}

export async function revokeUserSessionsAction(formData: FormData) {
  const userId = formData.get("userId");
  if (typeof userId !== "string") throw new Error("Invalid user");
  await revokeAllSessionsForUser(userId);
  revalidatePath("/admin/users");
}

export async function resetUserPasswordAction(formData: FormData) {
  const userId = formData.get("userId");
  const temporaryPassword = formData.get("temporaryPassword");
  if (typeof userId !== "string") redirectWithError("/admin/users", new Error("Invalid user"));
  try {
    await resetHospitalUserPassword(userId, temporaryPassword);
  } catch (error) {
    redirectWithError("/admin/users", error);
  }
  revalidatePath("/admin/users");
}

export async function updateUserAccessAction(formData: FormData) {
  const userId = formData.get("userId");
  if (typeof userId !== "string") redirectWithError("/admin/users", new Error("Invalid user"));
  try {
    await updateHospitalUserAccess(userId, {
      accountType: formData.get("accountType"),
      jobTypeId: formData.get("jobTypeId"),
      unitIds: formData.getAll("unitIds"),
    });
  } catch (error) {
    redirectWithError("/admin/users", error);
  }
  revalidatePath("/admin/users");
}

export async function unlockUserLoginAction(formData: FormData) {
  const userId = formData.get("userId");
  if (typeof userId !== "string") redirectWithError("/admin/users", new Error("Invalid user"));
  try {
    await unlockHospitalUserLogin(userId);
  } catch (error) {
    redirectWithError("/admin/users", error);
  }
  revalidatePath("/admin/users");
}
