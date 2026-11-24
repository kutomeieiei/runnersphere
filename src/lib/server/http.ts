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
  return json({ error: { code: "internal", message: messageFor("internal") } }, 500);
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
