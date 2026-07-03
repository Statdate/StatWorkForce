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
  const user = await authenticateUser(badgeNumber, password);

  if (!user) {
    return { message: "Invalid badge number or password." };
  }

  await createSession(user.id, user.accountType);
  redirect(dashboardPathFor(user.accountType));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
