"use server";

import { revalidatePath } from "next/cache";
import { sendMessage } from "@/lib/data/messages";
import { redirectWithError } from "@/lib/action-error";

// returnPath comes from a hidden form field the page itself renders (never
// user-typed), but it's still client-supplied — reject anything that isn't a
// same-app relative path so a tampered value can't turn into a
// protocol-relative redirect (e.g. "//evil.com").
function safeReturnPath(raw: string) {
  return /^\/(worker|manager)\//.test(raw) ? raw : "/worker/messages";
}

export async function sendMessageAction(formData: FormData) {
  const recipientId = String(formData.get("recipientId"));
  const body = String(formData.get("body"));
  const returnPath = safeReturnPath(String(formData.get("returnPath")));

  try {
    await sendMessage(recipientId, body);
  } catch (error) {
    redirectWithError(returnPath, error);
  }
  revalidatePath(returnPath);
}
