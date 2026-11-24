import { GAME_CONFIG } from "@/config/game";

/** รหัส error ที่ใช้ร่วมกันระหว่าง server และ client */
export type ApiErrorCode =
  | "unauthorized"
  | "session_expired"
  | "email_not_verified"
  | "profile_missing"
  | "invalid_input"
  | "invalid_nickname"
  | "outside_geofence"
  | "poor_accuracy"
  | "approximate_location"
  | "invalid_timestamp"
  | "daily_cap"
  | "outside_play_hours"
  | "no_spot"
  | "cooldown"
  | "no_active_mission"
  | "not_enough_coins"
  | "unknown_food"
  | "rate_limited"
  | "server_misconfigured"
  | "offline"
  | "internal";

/** ข้อความภาษาไทยที่เข้าใจง่ายสำหรับแสดงผู้เล่น */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  unauthorized: "กรุณาเข้าสู่ระบบก่อนเล่น",
  session_expired: "เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
  email_not_verified: "กรุณายืนยันอีเมลก่อนเริ่มเล่น (ดูลิงก์ในกล่องอีเมลของคุณ)",
  profile_missing: "ไม่พบข้อมูลผู้เล่น กำลังสร้างให้ใหม่…",
  invalid_input: "ข้อมูลที่ส่งมาไม่ถูกต้อง ลองใหม่อีกครั้ง",
  invalid_nickname: `ชื่อเล่นต้องมี 1–${GAME_CONFIG.profile.nicknameMaxLength} ตัวอักษร`,
  outside_geofence:
    "ตอนนี้คุณอยู่นอกพื้นที่โรงเรียน เกมนี้เล่นได้เฉพาะในโรงเรียนสาธิต มข. (มอดินแดง) เท่านั้น",
  poor_accuracy:
    "สัญญาณ GPS ยังไม่แม่นพอ ลองออกไปยืนที่โล่ง ห่างจากอาคารหรือหลังคาสักครู่",
  approximate_location:
    "ดูเหมือนเครื่องของคุณเปิด \"ตำแหน่งโดยประมาณ\" อยู่ กรุณาเปิด \"ตำแหน่งที่แม่นยำ\" ในการตั้งค่าแอป/เบราว์เซอร์",
  invalid_timestamp: "เวลาของตำแหน่งไม่ถูกต้อง ตรวจสอบว่าเวลาในเครื่องตั้งเป็นอัตโนมัติ",
  daily_cap: `วันนี้ไปครบ ${GAME_CONFIG.health.dailySpotCap} จุดแล้ว เก่งมาก! พักผ่อน ดื่มน้ำ แล้วกลับมาเล่นใหม่พรุ่งนี้นะ`,
  outside_play_hours: `เล่นได้เฉพาะช่วง ${GAME_CONFIG.playHours.start}–${GAME_CONFIG.playHours.end} น.`,
  no_spot: "ยังหาจุดที่เหมาะกับตำแหน่งของคุณไม่ได้ ลองขยับไปที่อื่นแล้วกดใหม่",
  cooldown: "พักหายใจสักครู่ แล้วค่อยเริ่มภารกิจถัดไปนะ",
  no_active_mission: "ไม่มีภารกิจที่กำลังทำอยู่",
  not_enough_coins: "เหรียญไม่พอ ออกไปเดินเก็บเหรียญเพิ่มกันเถอะ!",
  unknown_food: "ไม่พบอาหารนี้",
  rate_limited: "ส่งคำขอถี่เกินไป รอสักครู่",
  server_misconfigured: "ระบบยังตั้งค่าไม่ครบ (ผู้ดูแลต้องใส่ค่า environment ของ Firebase)",
  offline: "ไม่มีอินเทอร์เน็ต กรุณาเชื่อมต่อแล้วลองใหม่",
  internal: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
};

export function messageFor(code: string | undefined): string {
  return (code && ERROR_MESSAGES[code as ApiErrorCode]) || ERROR_MESSAGES.internal;
}
