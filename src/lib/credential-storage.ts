import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const bucket = process.env.CREDENTIAL_STORAGE_BUCKET?.trim();

let client: S3Client | null = null;

function getClient() {
  if (!bucket) throw new Error("Credential object storage is not configured");
  client ??= new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.CREDENTIAL_STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.CREDENTIAL_STORAGE_FORCE_PATH_STYLE === "true",
  });
  return client;
}

export function usesCredentialObjectStorage() {
  return Boolean(bucket);
}

export function credentialStoragePrefix(hospitalId: string) {
  return `hospitals/${hospitalId}/credentials/`;
}

export async function putCredentialObject(input: {
  hospitalId: string;
  credentialId: string;
  mimeType: string;
  data: Uint8Array<ArrayBuffer>;
}) {
  const key = `${credentialStoragePrefix(input.hospitalId)}${input.credentialId}/${randomUUID()}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: input.data,
      ContentType: input.mimeType,
      ServerSideEncryption: "AES256",
    })
  );
  return key;
}

export async function getCredentialObject(key: string, hospitalId: string) {
  if (!key.startsWith(credentialStoragePrefix(hospitalId))) {
    throw new Error("Credential storage tenant mismatch");
  }
  const result = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) return null;
  return result.Body.transformToByteArray();
}

export async function deleteCredentialObject(key: string) {
  if (!bucket) return;
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
