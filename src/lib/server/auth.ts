import { GAME_CONFIG } from "@/config/game";
import { adminAuth } from "./firebase-admin";
import { ApiError } from "./http";

export type AuthedUser = { uid: string; email: string | null; emailVerified: boolean };

/**
 * ยืนยันตัวตนจาก Firebase ID token ใน header `Authorization: Bearer <token>`
 * uid มาจาก token ที่ถูกตรวจลายเซ็นแล้วเท่านั้น — ไม่เชื่อ uid ที่ client ส่งมาเอง
 */
export async function requireUser(
  req: Request,
  opts: { allowUnverified?: boolean; checkRevoked?: boolean } = {},
): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new ApiError(401, "unauthorized");

  let decoded;
  try {
    // ตรวจลายเซ็น token ด้วย public key ของ Google (cache ไว้ ไม่ต้องเรียกเน็ตทุกครั้ง)
    // checkRevoked เรียก Firebase Auth เพิ่ม 1 รอบ จึงเปิดเฉพาะ endpoint ที่จำเป็น (สร้างโปรไฟล์ / ลบบัญชี)
    // endpoint อื่นปลอดภัยอยู่แล้ว: ถ้าบัญชีถูกลบ ข้อมูล users/{uid} ก็หายไปด้วย จึงตอบ profile_missing
    decoded = await adminAuth().verifyIdToken(match[1], opts.checkRevoked ?? false);
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
  return { uid: decoded.uid, email: decoded.email ?? null, emailVerified };
}

/** อีเมลที่อนุญาตให้ใช้เครื่องมือแก้แผนที่ (ว่าง = ทุกคนที่ล็อกอิน) */
export function editorAllowlist(): string[] {
  return (process.env.SPOT_EDITOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function canEditMap(user: AuthedUser): boolean {
  if (!GAME_CONFIG.features.mapEditor) return false;
  const allow = editorAllowlist();
  return allow.length === 0 || (user.email != null && allow.includes(user.email.toLowerCase()));
}

/** ต้องล็อกอิน + เปิดเครื่องมือแก้แผนที่ + (ถ้าตั้ง allowlist) อีเมลอยู่ในรายการ */
export async function requireMapEditor(req: Request): Promise<AuthedUser> {
  const user = await requireUser(req);
  if (!canEditMap(user)) throw new ApiError(403, "map_editor_forbidden");
  return user;
}
