import { GAME_CONFIG } from "@/config/game";

/** วันที่ในรูปแบบ YYYY-MM-DD ตามเขตเวลาที่กำหนด */
export function dateKey(nowMs: number, timeZone: string = GAME_CONFIG.timeZone): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(nowMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** รายการ dateKey ย้อนหลัง n วัน (รวมวันนี้) เรียงจากเก่าไปใหม่ */
export function lastNDateKeys(nowMs: number, n: number, timeZone: string = GAME_CONFIG.timeZone): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(dateKey(nowMs - i * 86_400_000, timeZone));
  }
  return keys;
}

/** นาทีนับจากเที่ยงคืนตามเขตเวลา */
export function minutesOfDay(nowMs: number, timeZone: string = GAME_CONFIG.timeZone): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** อยู่ในช่วงเวลาที่อนุญาตให้เล่นหรือไม่ (ถ้าปิดฟีเจอร์ = เล่นได้ตลอด) */
export function isWithinPlayHours(
  nowMs: number,
  cfg: { enabled: boolean; start: string; end: string } = GAME_CONFIG.playHours,
  timeZone: string = GAME_CONFIG.timeZone,
): boolean {
  if (!cfg.enabled) return true;
  const now = minutesOfDay(nowMs, timeZone);
  const start = parseHHMM(cfg.start);
  const end = parseHHMM(cfg.end);
  if (start <= end) return now >= start && now < end;
  // ช่วงข้ามเที่ยงคืน เช่น 20:00–06:00
  return now >= start || now < end;
}

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** ลำดับวันในสัปดาห์ (จันทร์ = 0 … อาทิตย์ = 6) ตามเขตเวลา */
export function weekdayIndex(nowMs: number, timeZone: string = GAME_CONFIG.timeZone): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date(nowMs));
  return WEEKDAY_INDEX[name] ?? 0;
}

/** dateKey ของวันจันทร์ในสัปดาห์นี้ — ใช้เป็น id ของกระดานอันดับรายสัปดาห์ */
export function weekStartKey(nowMs: number, timeZone: string = GAME_CONFIG.timeZone): string {
  return dateKey(nowMs - weekdayIndex(nowMs, timeZone) * 86_400_000, timeZone);
}

/** dateKey ตั้งแต่วันจันทร์ถึงวันนี้ (เรียงเก่าไปใหม่) */
export function weekDateKeysSoFar(nowMs: number, timeZone: string = GAME_CONFIG.timeZone): string[] {
  return lastNDateKeys(nowMs, weekdayIndex(nowMs, timeZone) + 1, timeZone);
}

/** dateKey ของวันอาทิตย์ท้ายสัปดาห์ */
export function weekEndKey(nowMs: number, timeZone: string = GAME_CONFIG.timeZone): string {
  return dateKey(nowMs + (6 - weekdayIndex(nowMs, timeZone)) * 86_400_000, timeZone);
}
