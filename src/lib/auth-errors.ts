import { GAME_CONFIG } from "@/config/game";

/** แปลง error code ของ Firebase Auth เป็นข้อความภาษาไทยที่เข้าใจง่าย */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "รูปแบบอีเมลไม่ถูกต้อง";
    case "auth/missing-email":
      return "กรุณากรอกอีเมล";
    case "auth/missing-password":
      return "กรุณากรอกรหัสผ่าน";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return `รหัสผ่านต้องมีอย่างน้อย ${GAME_CONFIG.auth.passwordMinLength} ตัวอักษร`;
    case "auth/email-already-in-use":
      return "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ หรือกด \"ลืมรหัสผ่าน\"";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "auth/user-disabled":
      return "บัญชีนี้ถูกระงับการใช้งาน";
    case "auth/too-many-requests":
      return "ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
    case "auth/network-request-failed":
      return "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ตรวจสอบสัญญาณแล้วลองใหม่";
    case "auth/requires-recent-login":
      return "เพื่อความปลอดภัย กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ก่อนทำรายการนี้";
    case "auth/operation-not-allowed":
      return "ระบบยังไม่ได้เปิดการล็อกอินด้วยอีเมล (ผู้ดูแลต้องเปิด Email/Password ใน Firebase)";
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/invalid-api-key":
      return "ตั้งค่า Firebase ไม่ถูกต้อง (API key)";
    case "auth/unauthorized-domain":
    case "auth/unauthorized-continue-uri":
      return "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase (Authorized domains)";
    default:
      return "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
  }
}

export function validatePassword(pw: string): string | null {
  if (pw.length < GAME_CONFIG.auth.passwordMinLength) {
    return `รหัสผ่านต้องมีอย่างน้อย ${GAME_CONFIG.auth.passwordMinLength} ตัวอักษร`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "กรุณากรอกอีเมล";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "รูปแบบอีเมลไม่ถูกต้อง";
  return null;
}
