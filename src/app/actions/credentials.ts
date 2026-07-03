"use server";

import { revalidatePath } from "next/cache";
import { addMyCredential, uploadMyCredentialFile } from "@/lib/data/worker";

export async function addCredentialAction(formData: FormData) {
  const file = formData.get("file");
  await addMyCredential({
    type: String(formData.get("type")),
    customName: formData.get("customName")?.toString() ?? null,
    issuingBody: formData.get("issuingBody")?.toString() ?? null,
    credentialNumber: formData.get("credentialNumber")?.toString() ?? null,
    expirationDate: String(formData.get("expirationDate")),
    file:
      file instanceof File && file.size > 0
        ? {
            name: file.name,
            mimeType: file.type,
            data: new Uint8Array(await file.arrayBuffer()),
          }
        : null,
  });
  revalidatePath("/worker/credentials");
}

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
