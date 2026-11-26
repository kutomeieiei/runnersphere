import { unstable_rethrow } from "next/navigation";
import { messageFor, type ApiErrorCode } from "@/lib/errors";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    public extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return json(
      { error: { code: err.code, message: messageFor(err.code), ...err.extra } },
      err.status,
    );
  }
  console.error("[api] unexpected error", err);
  const code = classifyServerError(err);
  return json({ error: { code, message: messageFor(code) } }, code === "internal" ? 500 : 503);
}

/**
 * แปลง error จาก Firebase Admin ที่เกิดจากการตั้งค่าผิด ให้เป็นรหัสที่ผู้ดูแลเข้าใจได้
 * (ไม่ส่งข้อความดิบกลับไป เพื่อไม่ให้รายละเอียดภายในหลุดออกไป)
 */
export function classifyServerError(err: unknown): ApiErrorCode {
  const e = err as { code?: unknown; message?: unknown } | null;
  const msg = String(e?.message ?? "");
  const code = e?.code;
  if (
    /default credentials|private key|PEM|invalid_grant|Invalid JWT|DECODER routines|invalid-credential|unauthenticated/i.test(msg) ||
    code === 16
  ) {
    return "server_credentials";
  }
  if ((code === 5 || /NOT_FOUND/.test(msg)) && /database/i.test(msg)) return "firestore_missing";
  if (code === 7 || /PERMISSION_DENIED|permission/i.test(msg)) return "server_permission";
  return "internal";
}

/** ห่อ route handler ให้คืน error เป็น JSON รูปแบบเดียวกันเสมอ */
export function route(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (err) {
      // ปล่อย error ภายในของ Next.js (เช่น การ bail out จาก prerender) ให้ framework จัดการ
      unstable_rethrow(err);
      return errorResponse(err);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "invalid_input");
  }
}
