import { strToU8, zipSync } from "fflate";

export function safeArchiveSegment(value: string, fallback: string) {
  const safe = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return safe || fallback;
}

export function createCredentialArchive(
  documents: Array<{ archiveName: string; data: Uint8Array }>,
  manifest: unknown
) {
  const entries: Record<string, Uint8Array> = {
    "manifest.json": strToU8(`${JSON.stringify(manifest, null, 2)}\n`),
  };
  for (const document of documents) entries[document.archiveName] = document.data;
  return zipSync(entries, { level: 6 });
}
