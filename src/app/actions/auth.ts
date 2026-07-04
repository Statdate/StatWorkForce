"use server";

import { redirect } from "next/navigation";
import { authenticateUser, dashboardPathFor } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";
import { LoginFormSchema, type LoginFormState } from "@/lib/validation/auth";

export async function login(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const validatedFields = LoginFormSchema.safeParse({
    badgeNumber: formData.get("badgeNumber"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { badgeNumber, password } = validatedFields.data;
  const result = await authenticateUser(badgeNumber, password);

  if (!result.ok) {
    if (result.reason === "locked") {
      const minutes = Math.ceil(result.retryAfterSeconds / 60);
      return { message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
    }
    return { message: "Invalid badge number or password." };
  }

  await createSession(result.user.id, result.user.accountType);
  redirect(dashboardPathFor(result.user.accountType));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
