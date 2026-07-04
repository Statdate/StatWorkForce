import { fromByteArray } from "base64-js";
import { getItem } from "@/lib/storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "swf_mobile_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getItem(TOKEN_KEY);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(body?.error ?? "Something went wrong", response.status);
  }

  return body as T;
}

export type LoginResponse = {
  token: string;
  user: { id: string; firstName: string; lastName: string; accountType: string };
};

export function login(badgeNumber: string, password: string) {
  return request<LoginResponse>("/api/auth/token", {
    method: "POST",
    body: JSON.stringify({ badgeNumber, password }),
  });
}

export type MeResponse = {
  id: string;
  firstName: string;
  lastName: string;
  accountType: string;
  badgeNumber: string;
  hospitalName: string;
  units: { id: string; name: string; type: string }[];
};

export function getMe() {
  return request<MeResponse>("/api/me");
}

export type ScheduleAssignment = {
  id: string;
  shiftId: string;
  status: string;
  shift: {
    startTime: string;
    endTime: string;
    unit: { name: string };
    jobType: { name: string };
    // null covers standalone shifts (no schedule period at all) — treated as
    // always syncable, only DRAFT periods hold sync back.
    schedulePeriod: { status: "DRAFT" | "PUBLISHED" } | null;
  };
};

export function getSchedule() {
  return request<{ assignments: ScheduleAssignment[] }>("/api/schedule");
}

export type CredentialType =
  | "RN_LICENSE"
  | "LPN_LICENSE"
  | "ACLS"
  | "BLS"
  | "PALS"
  | "NIHSS"
  | "CCRN"
  | "CMC"
  | "ADVANCED_DEGREE"
  | "OTHER";

// Mirrors src/lib/credential-types.ts's CREDENTIAL_TYPE_LABELS — kept in
// sync by hand since the mobile app can't import server-only Prisma types.
export const CREDENTIAL_TYPE_OPTIONS: { value: CredentialType; label: string }[] = [
  { value: "RN_LICENSE", label: "RN License (Nursing)" },
  { value: "LPN_LICENSE", label: "LPN License (Nursing)" },
  { value: "ACLS", label: "ACLS" },
  { value: "BLS", label: "BLS" },
  { value: "PALS", label: "PALS" },
  { value: "NIHSS", label: "NIHSS" },
  { value: "CCRN", label: "CCRN" },
  { value: "CMC", label: "CMC" },
  { value: "ADVANCED_DEGREE", label: "Advanced Degree" },
  { value: "OTHER", label: "Custom / Other" },
];

export type Credential = {
  id: string;
  type: string;
  customName: string | null;
  issuingBody: string | null;
  expirationDate: string;
  fileName: string | null;
  fileUploadedAt: string | null;
};

export function getCredentials() {
  return request<{ credentials: Credential[] }>("/api/credentials");
}

export async function addCredential(input: {
  type: CredentialType;
  customName?: string;
  issuingBody?: string;
  credentialNumber?: string;
  expirationDate: string;
  file?: { uri: string; name: string; mimeType: string };
}) {
  const token = await getItem(TOKEN_KEY);
  const form = new FormData();
  form.append("type", input.type);
  if (input.customName) form.append("customName", input.customName);
  if (input.issuingBody) form.append("issuingBody", input.issuingBody);
  if (input.credentialNumber) form.append("credentialNumber", input.credentialNumber);
  form.append("expirationDate", input.expirationDate);
  if (input.file) {
    form.append("file", {
      uri: input.file.uri,
      name: input.file.name,
      type: input.file.mimeType,
    } as unknown as Blob);
  }

  const response = await fetch(`${API_URL}/api/credentials`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body?.error ?? "Could not add credential", response.status);
  }
  return body as { credential: Credential };
}

/** Separate from request(): multipart needs fetch to set the Content-Type
 * boundary itself, so the JSON header the shared helper adds must not apply.
 * React Native's FormData takes a `{ uri, name, type }` descriptor instead of
 * a web File/Blob. */
export async function uploadCredentialFile(
  credentialId: string,
  file: { uri: string; name: string; mimeType: string }
) {
  const token = await getItem(TOKEN_KEY);
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  const response = await fetch(`${API_URL}/api/credentials/${credentialId}/file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body?.error ?? "Upload failed", response.status);
  }
  return body as { ok: true };
}

/** Fetches the uploaded credential document and returns it as a data: URI.
 * There's no way to attach an Authorization header to a plain URL open (in-
 * app browser, Linking, etc.), so the file has to be fetched here — with the
 * Bearer token — and handed to the caller as a self-contained URI instead.
 * WebKit (and therefore expo-web-browser's in-app browser) can render both
 * images and PDFs directly from a data: URI, so this covers both without
 * needing a PDF-rendering dependency. */
export async function getCredentialFileDataUri(credentialId: string): Promise<string> {
  const token = await getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}/api/credentials/${credentialId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body?.error ?? "Could not load document", response.status);
  }
  const mimeType = response.headers.get("content-type") ?? "application/octet-stream";
  // React Native's Blob implementation can't wrap a raw ArrayBuffer/
  // ArrayBufferView ("Creating blobs from 'ArrayBuffer' and
  // 'ArrayBufferView' are not supported") — the usual response.blob() +
  // FileReader.readAsDataURL() approach throws on-device even though it
  // works fine in a browser. Reading the response as an ArrayBuffer and
  // base64-encoding it directly (via the same base64-js helper React
  // Native's own internals use) sidesteps RN's Blob path entirely.
  const buffer = await response.arrayBuffer();
  return `data:${mimeType};base64,${fromByteArray(new Uint8Array(buffer))}`;
}

export type OpenShift = {
  id: string;
  startTime: string;
  endTime: string;
  requiredCount: number;
  signedUpCount: number;
  unit: { name: string };
  jobType: { name: string };
};

export function getOpenShifts() {
  return request<{ shifts: OpenShift[] }>("/api/schedule/open");
}

export function signUpForShift(shiftId: string) {
  return request<{ ok: true }>("/api/schedule/signup", {
    method: "POST",
    body: JSON.stringify({ shiftId }),
  });
}


export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  sentAt: string;
  readAt: string | null;
};

/** markRead marks everything read server-side after fetching; the returned
 * list still carries pre-read state so unread rows can be highlighted once. */
export function getNotifications(markRead = false) {
  return request<{ notifications: AppNotification[] }>(
    `/api/notifications${markRead ? "?markRead=1" : ""}`
  );
}

export type MessageThread = {
  id: string;
  firstName: string;
  lastName: string;
  unreadCount: number;
};

export function getMessageThreads() {
  return request<{ threads: MessageThread[] }>("/api/messages/threads");
}

export type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  sentAt: string;
};

export function getConversation(partnerId: string) {
  return request<{ messages: Message[] }>(`/api/messages/${partnerId}`);
}

export function sendMessage(recipientId: string, body: string) {
  return request<{ ok: true }>("/api/messages/send", {
    method: "POST",
    body: JSON.stringify({ recipientId, body }),
  });
}

export function registerPushToken(token: string) {
  return request<{ ok: true }>("/api/me/push-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export type TimeOffRequestType = "SICK" | "VACATION" | "LIFE_BALANCE" | "OTHER";
export type TimeOffRequestStatus = "PENDING" | "APPROVED" | "DENIED";

export type TimeOffRequest = {
  id: string;
  type: TimeOffRequestType;
  startDate: string;
  endDate: string;
  hours: number;
  reason: string | null;
  status: TimeOffRequestStatus;
  requestedAt: string;
};

// Total hours for the whole request, not per-day.
export const TIME_OFF_HOURS_OPTIONS = [2, 4, 6, 8, 10, 12, 16, 24] as const;

export function getTimeOffRequests() {
  return request<{ requests: TimeOffRequest[] }>("/api/timeoff");
}

export function requestTimeOff(
  type: TimeOffRequestType,
  startDate: string,
  endDate: string,
  hours: number,
  reason?: string
) {
  return request<{ request: TimeOffRequest }>("/api/timeoff", {
    method: "POST",
    body: JSON.stringify({ type, startDate, endDate, hours, reason }),
  });
}

export function withdrawTimeOffRequest(requestId: string) {
  return request<{ ok: true }>(`/api/timeoff/${requestId}`, {
    method: "DELETE",
  });
}

export { TOKEN_KEY };
