import { GAME_CONFIG } from "@/config/game";
import type { LatLng } from "@/config/game";
import { checkSpeed, rateLimitWaitMs, validateTimestamp, type SpeedSample } from "./anticheat";
import { haversineM } from "./geo";

export type PositionReading = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

export type AccuracyLevel = "good" | "poor" | "approximate";

/**
 * จัดระดับความแม่นยำของ GPS
 * - good: ใช้นับการถึงจุดได้
 * - poor: แม่นไม่พอ แนะนำให้ไปที่โล่ง
 * - approximate: แย่มากจนน่าจะเปิด "ตำแหน่งโดยประมาณ" ไว้ แนะนำให้เปิดตำแหน่งแบบแม่นยำ
 */
export function classifyAccuracy(
  accuracyM: number,
  cfg: typeof GAME_CONFIG.arrival = GAME_CONFIG.arrival,
): AccuracyLevel {
  if (!Number.isFinite(accuracyM) || accuracyM >= cfg.approximateThresholdM) return "approximate";
  if (accuracyM > cfg.maxAccuracyM) return "poor";
  return "good";
}

/** ข้อมูลภารกิจส่วนที่ใช้ตรวจการถึงจุด (ตรงกับที่เก็บใน Firestore) */
export type MissionCheckState = {
  target: LatLng;
  radiusM: number;
  expiresAt: number;
  minCompletionAt: number;
  consecutive: number;
  flags: number;
  /** ตำแหน่งล่าสุดที่ผ่านการตรวจ ใช้เป็นฐานคำนวณความเร็ว (ลบทิ้งเมื่อจบภารกิจ) */
  lastCheck: SpeedSample | null;
  /** เวลา server ของการตรวจครั้งล่าสุด (ใช้ rate limit) */
  lastCheckServerAt: number | null;
};

export type CheckOutcome =
  | "rate_limited"
  | "invalid_timestamp"
  | "poor_accuracy"
  | "too_fast"
  | "flagged"
  | "expired"
  | "not_arrived"
  | "counting"
  | "arrived";

export type CheckResult = {
  outcome: CheckOutcome;
  distanceM: number | null;
  consecutive: number;
  required: number;
  retryAfterMs?: number;
  /** ค่าที่ต้องอัปเดตลงภารกิจ (null = ไม่ต้องเขียน) */
  patch: Partial<MissionCheckState> | null;
};

type Cfg = {
  arrival: typeof GAME_CONFIG.arrival;
  antiCheat: typeof GAME_CONFIG.antiCheat;
};

/**
 * ตรวจตำแหน่งหนึ่งครั้งกับภารกิจที่ active อยู่ (pure function — ใช้ฝั่ง server)
 * ลำดับ: หมดอายุ → rate limit → timestamp → accuracy → ความเร็ว → ระยะถึงจุด
 */
export function processCheck(
  mission: MissionCheckState,
  reading: PositionReading,
  nowMs: number,
  cfg: Cfg = GAME_CONFIG,
): CheckResult {
  const required = cfg.arrival.requiredConsecutive;
  const base = { required, consecutive: mission.consecutive };

  if (nowMs >= mission.expiresAt) {
    return { ...base, outcome: "expired", distanceM: null, consecutive: 0, patch: null };
  }

  const wait = rateLimitWaitMs(mission.lastCheckServerAt, nowMs, cfg.arrival.minCheckIntervalMs);
  if (wait > 0) {
    return { ...base, outcome: "rate_limited", distanceM: null, retryAfterMs: wait, patch: null };
  }

  const ts = validateTimestamp(
    reading.timestamp,
    nowMs,
    mission.lastCheck?.timestamp ?? null,
    cfg.antiCheat,
  );
  if (ts !== "ok") {
    return {
      ...base,
      outcome: "invalid_timestamp",
      distanceM: null,
      consecutive: 0,
      patch: { consecutive: 0, lastCheckServerAt: nowMs },
    };
  }

  const distanceM = haversineM(reading, mission.target);

  if (classifyAccuracy(reading.accuracy, cfg.arrival) !== "good") {
    // ตำแหน่งไม่แม่น: ไม่นับ และไม่ใช้เป็นฐานคำนวณความเร็ว
    return {
      ...base,
      outcome: "poor_accuracy",
      distanceM,
      consecutive: 0,
      patch: { consecutive: 0, lastCheckServerAt: nowMs },
    };
  }

  const sample: SpeedSample = { ...pick(reading), serverAt: nowMs };

  if (mission.lastCheck) {
    const speed = checkSpeed(mission.lastCheck, sample, cfg.antiCheat);
    if (speed.suspicious) {
      const flags = mission.flags + 1;
      // ไม่อัปเดต lastCheck — ต้อง "เดิน" จากตำแหน่งเดิมจริงๆ ถึงจะผ่าน
      return {
        ...base,
        outcome: flags >= cfg.antiCheat.maxFlagsPerMission ? "flagged" : "too_fast",
        distanceM,
        consecutive: 0,
        patch: { consecutive: 0, flags, lastCheckServerAt: nowMs },
      };
    }
  }

  const inRadius = distanceM <= mission.radiusM;
  let consecutive = inRadius ? Math.min(required, mission.consecutive + 1) : 0;
  let outcome: CheckOutcome = inRadius ? "counting" : "not_arrived";

  if (consecutive >= required) {
    if (nowMs >= mission.minCompletionAt) {
      outcome = "arrived";
    } else {
      // ถึงเร็วผิดปกติเมื่อเทียบกับระยะทาง — ยังไม่ให้ผ่าน รอให้ครบเวลาขั้นต่ำ
      consecutive = required - 1;
      outcome = "counting";
    }
  }

  return {
    ...base,
    outcome,
    distanceM,
    consecutive,
    patch: { consecutive, lastCheck: sample, lastCheckServerAt: nowMs },
  };
}

function pick(r: PositionReading): Omit<SpeedSample, "serverAt"> {
  return { lat: r.lat, lng: r.lng, accuracy: r.accuracy, timestamp: r.timestamp };
}

/** ตรวจว่า body ที่ client ส่งมาเป็นตำแหน่งที่ถูกรูปแบบ */
export function parseReading(body: unknown): PositionReading | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const { lat, lng, accuracy, timestamp } = b;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof accuracy !== "number" ||
    typeof timestamp !== "number"
  ) {
    return null;
  }
  if (![lat, lng, accuracy, timestamp].every(Number.isFinite)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || accuracy < 0) return null;
  return { lat, lng, accuracy, timestamp };
}
