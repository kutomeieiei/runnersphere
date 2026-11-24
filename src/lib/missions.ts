import type { LatLng, Spot, SpotDifficulty } from "@/config/game";
import { GAME_CONFIG } from "@/config/game";
import { haversineM, pointInPolygon } from "./geo";

export type SelectSpotInput = {
  spots: Spot[];
  player: LatLng;
  geofence: LatLng[];
  lastSpotId?: string | null;
  minDistanceM?: number;
  maxDistanceM?: number;
  /** ฟังก์ชันสุ่ม 0..1 (ส่งเข้ามาได้เพื่อให้ test ได้) */
  rng?: () => number;
};

export type SelectedSpot = { spot: Spot; distanceM: number };

/**
 * เลือกจุดภารกิจแบบสุ่มจากรายการที่เตรียมไว้ (ไม่สุ่มพิกัดอิสระ)
 * - ต้องเปิดใช้งาน และอยู่ใน geofence
 * - ไม่ซ้ำกับจุดก่อนหน้า
 * - ห่างจากผู้เล่นอย่างน้อย minDistanceM
 * - ถ้ามีจุดในช่วง [min, max] จะสุ่มจากช่วงนั้น
 *   ถ้าไม่มี จะสุ่มจาก 3 จุดที่ใกล้ที่สุดที่ยังไกลกว่า min
 */
export function selectSpot(input: SelectSpotInput): SelectedSpot | null {
  const {
    spots,
    player,
    geofence,
    lastSpotId = null,
    minDistanceM = GAME_CONFIG.start.minSpotDistanceM,
    maxDistanceM = GAME_CONFIG.start.maxSpotDistanceM,
    rng = Math.random,
  } = input;

  const candidates = spots
    .filter((s) => s.enabled !== false)
    .filter((s) => s.id !== lastSpotId)
    .filter((s) => pointInPolygon(s.position, geofence))
    .map((spot) => ({ spot, distanceM: haversineM(player, spot.position) }))
    .filter((c) => c.distanceM >= minDistanceM);

  if (candidates.length === 0) return null;

  const inRange = candidates.filter((c) => c.distanceM <= maxDistanceM);
  const pool =
    inRange.length > 0
      ? inRange
      : [...candidates].sort((a, b) => a.distanceM - b.distanceM).slice(0, 3);

  const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[idx];
}

/** เหรียญที่ได้ = พื้นฐาน + ตามระยะทาง + โบนัสความยาก (มีเพดาน) */
export function calcCoins(
  distanceM: number,
  difficulty: SpotDifficulty,
  cfg: typeof GAME_CONFIG.coins = GAME_CONFIG.coins,
): number {
  const byDistance = Math.floor(Math.max(0, distanceM) / cfg.metersPerCoin);
  const total = cfg.base + byDistance + (cfg.difficultyBonus[difficulty] ?? 0);
  return Math.max(1, Math.min(cfg.maxPerMission, total));
}

/**
 * เวลาเร็วที่สุดที่เป็นไปได้ในการไปถึงจุด (ms) — กัน teleport
 * คิดจากระยะทางลบรัศมีและค่าคลาดเคลื่อน หารด้วยความเร็วสูงสุด
 */
export function minTravelMs(
  distanceM: number,
  radiusM: number = GAME_CONFIG.arrival.radiusM,
  maxSpeedMps: number = GAME_CONFIG.antiCheat.maxSpeedMps,
  slackM: number = GAME_CONFIG.arrival.maxAccuracyM,
): number {
  const effective = Math.max(0, distanceM - radiusM - slackM);
  return Math.round((effective / maxSpeedMps) * 1000);
}
