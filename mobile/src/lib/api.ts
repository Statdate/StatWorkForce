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
  status: string;
  shift: {
    startTime: string;
    endTime: string;
    unit: { name: string };
    jobType: { name: string };
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
};

export function getCredentials() {
  return request<{ credentials: Credential[] }>("/api/credentials");
}

export { TOKEN_KEY };
