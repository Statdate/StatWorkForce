"use server";

import { revalidatePath } from "next/cache";
import { sendMessage } from "@/lib/data/messages";

export async function sendMessageAction(formData: FormData) {
  const recipientId = String(formData.get("recipientId"));
  const body = String(formData.get("body"));
  const returnPath = String(formData.get("returnPath"));

  await sendMessage(recipientId, body);
  revalidatePath(returnPath);
}
