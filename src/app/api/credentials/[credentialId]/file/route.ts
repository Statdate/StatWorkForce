import { getApiUser } from "@/lib/dal";
import { getCredentialFileForUser, saveCredentialFileForUser } from "@/lib/data/worker";
import { corsJson, corsOptionsResponse, CORS_HEADERS } from "@/lib/cors";

/** Serves the uploaded credential document. getApiUser() accepts either the
 * web session cookie or a mobile Bearer token, so the same URL backs the
 * web "View document" link and an authenticated mobile fetch. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const { credentialId } = await params;
  const file = await getCredentialFileForUser(user.id, credentialId);
  if (!file) {
    return corsJson({ error: "No document on file" }, { status: 404 });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": file.mimeType,
      // inline so PDFs/images open in the browser tab; the filename still
      // applies if the user chooses to save.
      "Content-Disposition": `inline; filename="${file.fileName.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  const user = await getApiUser();
  if (!user) {
    return corsJson({ error: "Not authenticated" }, { status: 401 });
  }

  const { credentialId } = await params;

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return corsJson({ error: "Expected multipart/form-data with a `file` field" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return corsJson({ error: "Expected multipart/form-data with a `file` field" }, { status: 400 });
  }

  try {
    await saveCredentialFileForUser(user.id, credentialId, {
      name: file.name,
      mimeType: file.type,
      data: new Uint8Array(await file.arrayBuffer()),
    });
  } catch (error) {
    return corsJson(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }

  return corsJson({ ok: true });
}

export async function OPTIONS() {
  return corsOptionsResponse();
}
