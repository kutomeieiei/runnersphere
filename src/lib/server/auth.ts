import { GAME_CONFIG } from "@/config/game";
import { adminAuth } from "./firebase-admin";
import { ApiError } from "./http";

export type AuthedUser = { uid: string; emailVerified: boolean };

/**
 * ยืนยันตัวตนจาก Firebase ID token ใน header `Authorization: Bearer <token>`
 * uid มาจาก token ที่ถูกตรวจลายเซ็นแล้วเท่านั้น — ไม่เชื่อ uid ที่ client ส่งมาเอง
 */
export async function requireUser(
  req: Request,
  opts: { allowUnverified?: boolean } = {},
): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new ApiError(401, "unauthorized");

  let decoded;
  try {
    // checkRevoked = true: บัญชีที่ถูกลบ/ปิด จะใช้ token เดิมต่อไม่ได้
    decoded = await adminAuth().verifyIdToken(match[1], true);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const code = (err as { code?: string })?.code ?? "";
    if (code.includes("id-token-expired") || code.includes("id-token-revoked")) {
      throw new ApiError(401, "session_expired");
    }
    throw new ApiError(401, "unauthorized");
  }

  const emailVerified = decoded.email_verified === true;
  if (GAME_CONFIG.features.requireEmailVerification && !emailVerified && !opts.allowUnverified) {
    throw new ApiError(403, "email_not_verified");
  }
  return { uid: decoded.uid, emailVerified };
}
