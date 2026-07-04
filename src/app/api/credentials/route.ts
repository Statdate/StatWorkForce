import { getApiUser } from "@/lib/dal";
import { getCredentialsForUser, addCredentialForUser } from "@/lib/data/worker";
import { corsJson, corsOptionsResponse } from "@/lib/cors";

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const credentials = await getCredentialsForUser(user.id);
  return corsJson({ credentials });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return corsJson({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");

  try {
    const credential = await addCredentialForUser(user.id, {
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
    return corsJson({ credential });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Could not add credential" },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
