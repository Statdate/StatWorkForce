import type { CredentialType } from "@/generated/prisma/client";

/** Display labels for the CredentialType enum, in the order the dropdown
 * should show them. OTHER doubles as "specialty certification" — the worker
 * supplies the name. */
export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  RN_LICENSE: "RN License (Nursing)",
  LPN_LICENSE: "LPN License (Nursing)",
  ACLS: "ACLS",
  BLS: "BLS",
  PALS: "PALS",
  NIHSS: "NIHSS",
  CCRN: "CCRN",
  CMC: "CMC",
  ADVANCED_DEGREE: "Advanced Degree",
  OTHER: "Custom / Other",
};

export const CREDENTIAL_TYPE_OPTIONS = Object.entries(CREDENTIAL_TYPE_LABELS) as [
  CredentialType,
  string,
][];

export function credentialDisplayName(credential: {
  type: CredentialType;
  customName: string | null;
}) {
  return credential.customName ?? CREDENTIAL_TYPE_LABELS[credential.type] ?? credential.type;
}

/** The reminder window: notifications fire and lists flag "expiring soon"
 * starting 2 months out, per the founder's spec. */
export const EXPIRING_SOON_MS = 60 * 24 * 60 * 60 * 1000;

export function credentialStatus(expirationDate: Date) {
  const now = Date.now();
  const expiresAt = expirationDate.getTime();
  if (expiresAt < now) return { label: "Expired", className: "bg-red-100 text-red-700" };
  if (expiresAt - now < EXPIRING_SOON_MS)
    return { label: "Expiring soon", className: "bg-amber-100 text-amber-700" };
  return { label: "Current", className: "bg-emerald-100 text-emerald-700" };
}
