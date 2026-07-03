"use server";

import { revalidatePath } from "next/cache";
import { uploadMyCredentialFile } from "@/lib/data/worker";

export async function uploadCredentialFileAction(formData: FormData) {
  const credentialId = String(formData.get("credentialId"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }

  await uploadMyCredentialFile(credentialId, {
    name: file.name,
    mimeType: file.type,
    data: new Uint8Array(await file.arrayBuffer()),
  });
  revalidatePath("/worker/credentials");
}
