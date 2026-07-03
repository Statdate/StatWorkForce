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

export function getMe() {
  return request<{
    id: string;
    firstName: string;
    lastName: string;
    accountType: string;
    badgeNumber: string;
  }>("/api/me");
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

export function dropShift(shiftId: string) {
  return request<{ ok: true }>("/api/schedule/drop", {
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

export { TOKEN_KEY };
