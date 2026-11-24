import { GAME_CONFIG } from "@/config/game";
import { haversineM } from "./geo";

export type AntiCheatConfig = typeof GAME_CONFIG.antiCheat;

export type TimestampVerdict = "ok" | "too_old" | "in_future" | "not_monotonic" | "invalid";

/**
 * ตรวจ timestamp ของตำแหน่งที่ client ส่งมา
 * - ต้องไม่เก่าเกิน maxPositionAgeMs (เผื่อเวลาเครื่องคลาด maxClockSkewMs)
 * - ต้องไม่อยู่ในอนาคตเกิน maxClockSkewMs
 * - ต้องใหม่กว่าตำแหน่งก่อนหน้า (กันส่งค่าเดิมซ้ำเพื่อนับครั้งติดกัน)
 */
export function validateTimestamp(
  timestamp: unknown,
  nowMs: number,
  previousTimestamp: number | null | undefined,
  cfg: AntiCheatConfig = GAME_CONFIG.antiCheat,
): TimestampVerdict {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) {
    return "invalid";
  }
  if (timestamp > nowMs + cfg.maxClockSkewMs) return "in_future";
  if (timestamp < nowMs - cfg.maxPositionAgeMs - cfg.maxClockSkewMs) return "too_old";
  if (previousTimestamp != null && timestamp <= previousTimestamp) return "not_monotonic";
  return "ok";
}

export type SpeedSample = {
  lat: number;
  lng: number;
  accuracy: number;
  /** เวลาของตำแหน่งจากเครื่องผู้ใช้ */
  timestamp: number;
  /** เวลา server ที่ได้รับตำแหน่งนี้ */
  serverAt: number;
};

export type SpeedVerdict = {
  speedMps: number;
  suspicious: boolean;
};

/**
 * ประมาณความเร็วระหว่างตำแหน่งสองจุด เพื่อจับ teleport
 * - หักค่าคลาดเคลื่อน (accuracy) ของทั้งสองจุดออกก่อน เพื่อไม่ให้ GPS กระโดดเล็กน้อยถูกจับผิด
 * - ใช้เวลาที่น้อยกว่าระหว่างเวลาเครื่องผู้ใช้กับเวลา server (+5 วินาที)
 *   เพื่อไม่ให้ปลอม timestamp ให้ดูเหมือนใช้เวลานานได้
 */
export function checkSpeed(
  prev: SpeedSample,
  cur: Omit<SpeedSample, "serverAt"> & { serverAt: number },
  cfg: AntiCheatConfig = GAME_CONFIG.antiCheat,
): SpeedVerdict {
  const distance = haversineM(prev, cur);
  const tolerance = Math.min(prev.accuracy + cur.accuracy, 80);
  const effective = Math.max(0, distance - tolerance);
  const dtClient = (cur.timestamp - prev.timestamp) / 1000;
  const dtServer = (cur.serverAt - prev.serverAt) / 1000 + 5;
  const dt = Math.max(1, Math.min(dtClient, dtServer));
  const speedMps = effective / dt;
  return { speedMps, suspicious: speedMps > cfg.maxSpeedMps };
}

/**
 * rate limit แบบง่าย: ต้องห่างจากครั้งก่อนอย่างน้อย minIntervalMs
 * คืนค่าจำนวน ms ที่ต้องรอ (0 = ผ่าน)
 */
export function rateLimitWaitMs(
  lastAt: number | null | undefined,
  nowMs: number,
  minIntervalMs: number,
): number {
  if (lastAt == null) return 0;
  const elapsed = nowMs - lastAt;
  return elapsed >= minIntervalMs ? 0 : minIntervalMs - elapsed;
}
