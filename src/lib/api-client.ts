"use client";

import { messageFor, type ApiErrorCode } from "./errors";
import { getFirebaseAuth } from "./firebase/client";

export const SESSION_EXPIRED_EVENT = "movemai:session-expired";

export class ApiClientError extends Error {
  constructor(
    public code: ApiErrorCode,
    public status: number,
    public extra: Record<string, unknown> = {},
  ) {
    super(messageFor(code));
  }
}

/**
 * เรียก API ฝั่ง server พร้อมแนบ Firebase ID token
 * (token ต่ออายุอัตโนมัติด้วย getIdToken())
 */
export async function api<T>(
  path: string,
  opts: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new ApiClientError("unauthorized", 401);
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiClientError("offline", 0);
  }

  let token: string;
  try {
    token = await user.getIdToken();
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/network-request-failed") throw new ApiClientError("offline", 0);
    notifySessionExpired();
    throw new ApiClientError("session_expired", 401);
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError("offline", 0);
  }

  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { code?: ApiErrorCode } & Record<string, unknown> })
    | null;

  if (!res.ok) {
    const { code = "internal", ...extra } = data?.error ?? {};
    if (res.status === 401) notifySessionExpired();
    throw new ApiClientError(code as ApiErrorCode, res.status, extra);
  }
  return data as T;
}

function notifySessionExpired() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
