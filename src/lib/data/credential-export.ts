import "server-only";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";
import { getCredentialObject } from "@/lib/credential-storage";
import { createCredentialArchive, safeArchiveSegment } from "@/lib/credential-archive";

const MAX_DOCUMENTS = 100;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export class CredentialExportLimitError extends Error {
  constructor(public readonly reason: "document_count" | "total_bytes") {
    super("Credential document export exceeds the synchronous export limit");
    this.name = "CredentialExportLimitError";
  }
}

export async function getHospitalCredentialDocumentExport(admin: {
  id: string;
  hospitalId: string;
  accountType: string;
}) {
  if (admin.accountType !== "ADMIN") throw new Error("Administrator access required");
  const credentials = await prisma.credential.findMany({
    where: {
      user: { hospitalId: admin.hospitalId },
      fileName: { not: null },
      OR: [{ fileData: { not: null } }, { storageKey: { not: null } }],
    },
    select: {
      id: true,
      type: true,
      customName: true,
      expirationDate: true,
      fileName: true,
      fileMimeType: true,
      fileData: true,
      storageKey: true,
      user: { select: { badgeNumber: true, firstName: true, lastName: true } },
    },
    orderBy: { id: "asc" },
    take: MAX_DOCUMENTS + 1,
  });
  if (credentials.length > MAX_DOCUMENTS) throw new CredentialExportLimitError("document_count");

  let totalBytes = 0;
  const documents: Array<{ archiveName: string; data: Uint8Array }> = [];
  const manifestDocuments = [];
  for (const [index, credential] of credentials.entries()) {
    const data = credential.storageKey
      ? await getCredentialObject(credential.storageKey, admin.hospitalId)
      : credential.fileData;
    if (!data) throw new Error(`Credential document ${credential.id} is unavailable`);
    totalBytes += data.byteLength;
    if (totalBytes > MAX_TOTAL_BYTES) throw new CredentialExportLimitError("total_bytes");
    const originalName = credential.fileName ?? "document";
    const extensionMatch = /\.[a-zA-Z0-9]{1,10}$/.exec(originalName);
    const extension = extensionMatch?.[0].toLowerCase() ?? "";
    const stem = [credential.user.badgeNumber, credential.user.lastName, credential.user.firstName, credential.type]
      .map((value) => safeArchiveSegment(value, "unknown"))
      .join("-");
    const archiveName = `documents/${String(index + 1).padStart(3, "0")}-${stem}${extension}`;
    documents.push({ archiveName, data: new Uint8Array(data) });
    manifestDocuments.push({
      credentialId: credential.id,
      workerBadgeNumber: credential.user.badgeNumber,
      workerName: `${credential.user.firstName} ${credential.user.lastName}`,
      credentialType: credential.type,
      customName: credential.customName,
      expirationDate: credential.expirationDate.toISOString(),
      originalFileName: originalName,
      mimeType: credential.fileMimeType,
      archiveName,
      byteLength: data.byteLength,
    });
  }

  const exportedAt = new Date().toISOString();
  const archive = createCredentialArchive(documents, {
    schemaVersion: 1,
    exportedAt,
    hospitalId: admin.hospitalId,
    documentCount: documents.length,
    totalBytes,
    documents: manifestDocuments,
  });
  await recordAuditEvent({
    hospitalId: admin.hospitalId,
    actorId: admin.id,
    action: "CREDENTIAL_DOCUMENTS_EXPORTED",
    resourceType: "Credential",
    metadata: { documentCount: documents.length, totalBytes, format: "zip" },
  });
  return { archive, documentCount: documents.length, totalBytes };
}
