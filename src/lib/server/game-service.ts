import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { GAME_CONFIG, GEOFENCE, SPOTS, type LatLng } from "@/config/game";
import { DEFAULT_SPECIES_ID, PET_CONFIG, PET_SPECIES, findFood } from "@/config/pets";
import type {
  CheckResponse,
  DailyStats,
  FeedResponse,
  MeResponse,
  MissionHistoryItem,
  PublicMission,
  PublicPet,
  StartMissionResponse,
  StatsResponse,
} from "@/lib/api-types";
import { validateTimestamp, type SpeedSample } from "@/lib/anticheat";
import {
  classifyAccuracy,
  processCheck,
  type MissionCheckState,
  type PositionReading,
} from "@/lib/arrival";
import { pointInPolygon } from "@/lib/geo";
import { calcCoins, minTravelMs, selectSpot } from "@/lib/missions";
import { applyDecay, feedPet, newPet, petMood, rewardPetForMission, type PetState } from "@/lib/pet";
import { dateKey, isWithinPlayHours, lastNDateKeys } from "@/lib/time";
import { adminAuth, db } from "./firebase-admin";
import { ApiError } from "./http";

/* ---------------------------------------------------------------------------
 * Firestore data model
 *
 *   users/{uid}                     UserDoc   (โปรไฟล์ เหรียญ ภารกิจปัจจุบัน ยอดรวม)
 *   users/{uid}/pets/{petId}        PetDoc    (แยกเป็น collection เพื่อเพิ่มชนิด/หลายตัวได้ภายหลัง)
 *   users/{uid}/missions/{id}       MissionDoc (ผลลัพธ์ภารกิจ — ไม่เก็บเส้นทางเดิน)
 *   users/{uid}/daily/{YYYY-MM-DD}  DailyStats (สถิติรายวัน)
 *
 * ทุกการเขียนทำผ่าน Admin SDK ฝั่ง server เท่านั้น (Security Rules ปิดการเขียนจาก client)
 * ------------------------------------------------------------------------- */

type UserDoc = {
  nickname: string;
  coins: number;
  activePetId: string;
  activeMissionId: string | null;
  lastSpotId: string | null;
  lastMissionEndedAt: number | null;
  totals: { spots: number; distanceM: number; coinsEarned: number };
  createdAt: number;
  updatedAt: number;
};

type PetDoc = PetState;

type MissionStatus = "active" | "completed" | "cancelled" | "expired" | "flagged";

type MissionDoc = MissionCheckState & {
  spotId: string;
  spotName: string;
  spotHint: string | null;
  status: MissionStatus;
  startedAt: number;
  plannedDistanceM: number;
  coinsReward: number;
  endedAt: number | null;
  coinsAwarded: number;
};

const MAIN_PET_ID = "main";

const userRef = (uid: string) => db().collection("users").doc(uid);
const petRef = (uid: string, petId: string) => userRef(uid).collection("pets").doc(petId);
const missionsCol = (uid: string) => userRef(uid).collection("missions");
const dailyRef = (uid: string, key: string) => userRef(uid).collection("daily").doc(key);

function emptyDaily(date: string): DailyStats {
  return { date, spots: 0, distanceM: 0, coins: 0 };
}

function toPublicPet(id: string, pet: PetState): PublicPet {
  return {
    ...pet,
    id,
    mood: petMood(pet),
    xpToNext: PET_CONFIG.xpForLevel(pet.level),
  };
}

function toPublicMission(id: string, m: MissionDoc): PublicMission {
  return {
    id,
    spotId: m.spotId,
    spotName: m.spotName,
    spotHint: m.spotHint,
    target: m.target,
    radiusM: m.radiusM,
    startedAt: m.startedAt,
    expiresAt: m.expiresAt,
    coinsReward: m.coinsReward,
    plannedDistanceM: m.plannedDistanceM,
    consecutive: m.consecutive,
    required: GAME_CONFIG.arrival.requiredConsecutive,
  };
}

/** ข้อมูลที่จะเขียนเมื่อภารกิจจบโดยไม่ได้รางวัล (ลบตำแหน่งล่าสุดทิ้ง — ไม่เก็บเส้นทาง) */
function endMissionPatch(status: MissionStatus, now: number) {
  return {
    status,
    endedAt: now,
    lastCheck: FieldValue.delete(),
    lastCheckServerAt: FieldValue.delete(),
  };
}

async function readUser(tx: Transaction, uid: string): Promise<UserDoc> {
  const snap = await tx.get(userRef(uid));
  if (!snap.exists) throw new ApiError(404, "profile_missing");
  return snap.data() as UserDoc;
}

async function readActiveMission(
  tx: Transaction,
  uid: string,
  user: UserDoc,
): Promise<{ ref: DocumentReference; data: MissionDoc } | null> {
  if (!user.activeMissionId) return null;
  const ref = missionsCol(uid).doc(user.activeMissionId);
  const snap = await tx.get(ref);
  if (!snap.exists) return null;
  const data = snap.data() as MissionDoc;
  if (data.status !== "active") return null;
  return { ref, data };
}

/* ------------------------------------------------------------------------- */
/* โปรไฟล์                                                                     */
/* ------------------------------------------------------------------------- */

export function normalizeNickname(raw: unknown): string {
  if (typeof raw !== "string") throw new ApiError(400, "invalid_nickname");
  // ตัดอักขระควบคุมและช่องว่างซ้ำ
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  const length = [...cleaned].length;
  if (length < 1 || length > GAME_CONFIG.profile.nicknameMaxLength) {
    throw new ApiError(400, "invalid_nickname");
  }
  return cleaned;
}

/** สร้างโปรไฟล์ + สัตว์เลี้ยง + เหรียญเริ่มต้น (ถ้ามีอยู่แล้วจะแค่อัปเดตชื่อเล่น) */
export async function upsertProfile(uid: string, nicknameRaw: unknown): Promise<{ created: boolean }> {
  const nickname = normalizeNickname(nicknameRaw);
  const now = Date.now();
  return db().runTransaction(async (tx) => {
    const ref = userRef(uid);
    const snap = await tx.get(ref);
    if (snap.exists) {
      tx.update(ref, { nickname, updatedAt: now });
      return { created: false };
    }
    const species = PET_SPECIES[DEFAULT_SPECIES_ID];
    const user: UserDoc = {
      nickname,
      coins: GAME_CONFIG.profile.startingCoins,
      activePetId: MAIN_PET_ID,
      activeMissionId: null,
      lastSpotId: null,
      lastMissionEndedAt: null,
      totals: { spots: 0, distanceM: 0, coinsEarned: 0 },
      createdAt: now,
      updatedAt: now,
    };
    tx.create(ref, user);
    tx.create(petRef(uid, MAIN_PET_ID), newPet(species.id, species.name, now));
    return { created: true };
  });
}

export async function getMe(uid: string): Promise<MeResponse> {
  const now = Date.now();
  const snap = await userRef(uid).get();
  if (!snap.exists) throw new ApiError(404, "profile_missing");
  const user = snap.data() as UserDoc;

  const keys = lastNDateKeys(now, 7);
  const [petSnap, missionSnap, ...dailySnaps] = await db().getAll(
    petRef(uid, user.activePetId),
    missionsCol(uid).doc(user.activeMissionId ?? "_none"),
    ...keys.map((k) => dailyRef(uid, k)),
  );

  const petRaw = petSnap.exists
    ? (petSnap.data() as PetDoc)
    : newPet(DEFAULT_SPECIES_ID, PET_SPECIES[DEFAULT_SPECIES_ID].name, now);
  const pet = applyDecay(petRaw, now);

  let activeMission: PublicMission | null = null;
  if (missionSnap.exists) {
    const m = missionSnap.data() as MissionDoc;
    if (m.status === "active" && m.expiresAt > now) activeMission = toPublicMission(missionSnap.id, m);
  }

  const week = dailySnaps.map((s, i) =>
    s.exists ? { ...emptyDaily(keys[i]), ...(s.data() as DailyStats) } : emptyDaily(keys[i]),
  );

  return {
    profile: { nickname: user.nickname, coins: user.coins, totals: user.totals },
    pet: toPublicPet(user.activePetId, pet),
    activeMission,
    today: week[week.length - 1],
    week,
    serverTime: now,
  };
}

export async function getStats(uid: string): Promise<StatsResponse> {
  const now = Date.now();
  const snap = await userRef(uid).get();
  if (!snap.exists) throw new ApiError(404, "profile_missing");
  const user = snap.data() as UserDoc;
  const keys = lastNDateKeys(now, 28);
  const dailySnaps = await db().getAll(...keys.map((k) => dailyRef(uid, k)));
  const days = dailySnaps.map((s, i) =>
    s.exists ? { ...emptyDaily(keys[i]), ...(s.data() as DailyStats) } : emptyDaily(keys[i]),
  );
  const recentSnap = await missionsCol(uid).orderBy("startedAt", "desc").limit(10).get();
  const recent: MissionHistoryItem[] = recentSnap.docs.map((d) => {
    const m = d.data() as MissionDoc;
    return {
      id: d.id,
      spotName: m.spotName,
      status: m.status,
      startedAt: m.startedAt,
      endedAt: m.endedAt ?? null,
      coinsAwarded: m.coinsAwarded ?? 0,
      distanceM: m.status === "completed" ? m.plannedDistanceM : 0,
    };
  });
  return { days, recent, totals: user.totals };
}

/* ------------------------------------------------------------------------- */
/* ภารกิจ                                                                      */
/* ------------------------------------------------------------------------- */

export async function startMission(uid: string, reading: PositionReading): Promise<StartMissionResponse> {
  const now = Date.now();
  const cfg = GAME_CONFIG;

  return db().runTransaction(async (tx) => {
    const user = await readUser(tx, uid);
    const today = dateKey(now);
    const dailySnap = await tx.get(dailyRef(uid, today));
    const active = await readActiveMission(tx, uid, user);

    // มีภารกิจค้างอยู่แล้ว → คืนภารกิจเดิม (ครั้งละ 1 จุดเท่านั้น)
    if (active) {
      if (active.data.expiresAt > now) {
        return { mission: toPublicMission(active.ref.id, active.data), resumed: true };
      }
      tx.update(active.ref, endMissionPatch("expired", now));
    }

    if (!isWithinPlayHours(now)) throw new ApiError(403, "outside_play_hours");

    const daily = dailySnap.exists ? (dailySnap.data() as DailyStats) : emptyDaily(today);
    if (daily.spots >= cfg.health.dailySpotCap) throw new ApiError(403, "daily_cap");

    if (user.lastMissionEndedAt && now - user.lastMissionEndedAt < cfg.start.cooldownMs) {
      throw new ApiError(429, "cooldown", {
        retryAfterMs: cfg.start.cooldownMs - (now - user.lastMissionEndedAt),
      });
    }

    if (validateTimestamp(reading.timestamp, now, null) !== "ok") {
      throw new ApiError(400, "invalid_timestamp");
    }
    const level = classifyAccuracy(reading.accuracy);
    if (level === "approximate") throw new ApiError(422, "approximate_location");
    if (reading.accuracy > cfg.start.maxAccuracyM) throw new ApiError(422, "poor_accuracy");

    const player: LatLng = { lat: reading.lat, lng: reading.lng };
    if (!pointInPolygon(player, GEOFENCE.polygon)) throw new ApiError(403, "outside_geofence");

    const picked = selectSpot({
      spots: SPOTS,
      player,
      geofence: GEOFENCE.polygon,
      lastSpotId: user.lastSpotId,
    });
    if (!picked) throw new ApiError(409, "no_spot");

    const { spot, distanceM } = picked;
    const radiusM = cfg.arrival.radiusM;
    const startSample: SpeedSample = { ...player, accuracy: reading.accuracy, timestamp: reading.timestamp, serverAt: now };
    const mission: MissionDoc = {
      spotId: spot.id,
      spotName: spot.name,
      spotHint: spot.hint ?? null,
      target: spot.position,
      radiusM,
      status: "active",
      startedAt: now,
      expiresAt: now + cfg.mission.expireMinutes * 60_000,
      minCompletionAt: now + minTravelMs(distanceM, radiusM),
      plannedDistanceM: Math.round(distanceM),
      coinsReward: calcCoins(distanceM, spot.difficulty),
      consecutive: 0,
      flags: 0,
      // ตำแหน่งเริ่มต้น ใช้เป็นฐานตรวจความเร็วเท่านั้น และจะถูกลบเมื่อจบภารกิจ
      lastCheck: startSample,
      lastCheckServerAt: null,
      endedAt: null,
      coinsAwarded: 0,
    };
    const ref = missionsCol(uid).doc();
    tx.create(ref, mission);
    tx.update(userRef(uid), { activeMissionId: ref.id, updatedAt: now });
    return { mission: toPublicMission(ref.id, mission), resumed: false };
  });
}

export async function checkMission(uid: string, reading: PositionReading): Promise<CheckResponse> {
  const now = Date.now();
  const cfg = GAME_CONFIG;

  return db().runTransaction(async (tx) => {
    const user = await readUser(tx, uid);
    const active = await readActiveMission(tx, uid, user);
    if (!active) throw new ApiError(409, "no_active_mission");

    const today = dateKey(now);
    const dRef = dailyRef(uid, today);
    const pRef = petRef(uid, user.activePetId);
    // อ่านทุกอย่างก่อนเขียน (ข้อกำหนดของ transaction)
    const [dailySnap, petSnap] = await Promise.all([tx.get(dRef), tx.get(pRef)]);

    const result = processCheck(active.data, reading, now);
    const base: CheckResponse = {
      outcome: result.outcome,
      distanceM: result.distanceM == null ? null : Math.round(result.distanceM),
      consecutive: result.consecutive,
      required: result.required,
      retryAfterMs: result.retryAfterMs,
    };

    if (result.outcome === "expired" || result.outcome === "flagged") {
      tx.update(active.ref, endMissionPatch(result.outcome, now));
      tx.update(userRef(uid), {
        activeMissionId: null,
        lastSpotId: active.data.spotId,
        lastMissionEndedAt: now,
        updatedAt: now,
      });
      return base;
    }

    if (result.outcome !== "arrived") {
      if (result.patch) tx.update(active.ref, result.patch);
      return base;
    }

    // ---- ถึงจุดแล้ว: ให้เหรียญ อัปเดตสัตว์เลี้ยงและสถิติ (ทำที่ server เท่านั้น) ----
    const coins = active.data.coinsReward;
    const distanceM = active.data.plannedDistanceM;
    const daily = dailySnap.exists ? (dailySnap.data() as DailyStats) : emptyDaily(today);
    const newDaily: DailyStats = {
      date: today,
      spots: daily.spots + 1,
      distanceM: daily.distanceM + distanceM,
      coins: daily.coins + coins,
    };

    const petBefore = petSnap.exists
      ? applyDecay(petSnap.data() as PetDoc, now)
      : newPet(DEFAULT_SPECIES_ID, PET_SPECIES[DEFAULT_SPECIES_ID].name, now);
    const petAfter = rewardPetForMission(petBefore);

    tx.update(active.ref, {
      ...endMissionPatch("completed", now),
      consecutive: result.consecutive,
      coinsAwarded: coins,
    });
    tx.set(dRef, newDaily);
    tx.set(pRef, petAfter);
    tx.update(userRef(uid), {
      coins: FieldValue.increment(coins),
      activeMissionId: null,
      lastSpotId: active.data.spotId,
      lastMissionEndedAt: now,
      "totals.spots": FieldValue.increment(1),
      "totals.distanceM": FieldValue.increment(distanceM),
      "totals.coinsEarned": FieldValue.increment(coins),
      updatedAt: now,
    });

    return {
      ...base,
      reward: {
        coins,
        totalCoins: user.coins + coins,
        petLeveledUp: petAfter.level > petBefore.level,
        today: newDaily,
        restReminder: newDaily.spots % cfg.health.restReminderEvery === 0,
        dailyCapReached: newDaily.spots >= cfg.health.dailySpotCap,
      },
    };
  });
}

export async function cancelMission(uid: string): Promise<{ cancelled: boolean }> {
  const now = Date.now();
  return db().runTransaction(async (tx) => {
    const user = await readUser(tx, uid);
    const active = await readActiveMission(tx, uid, user);
    if (!active) {
      if (user.activeMissionId) tx.update(userRef(uid), { activeMissionId: null, updatedAt: now });
      return { cancelled: false };
    }
    tx.update(active.ref, endMissionPatch("cancelled", now));
    tx.update(userRef(uid), {
      activeMissionId: null,
      lastSpotId: active.data.spotId,
      lastMissionEndedAt: now,
      updatedAt: now,
    });
    return { cancelled: true };
  });
}

/* ------------------------------------------------------------------------- */
/* สัตว์เลี้ยง                                                                  */
/* ------------------------------------------------------------------------- */

export async function feed(uid: string, foodId: unknown): Promise<FeedResponse> {
  const food = typeof foodId === "string" ? findFood(foodId) : undefined;
  if (!food) throw new ApiError(400, "unknown_food");
  const now = Date.now();

  return db().runTransaction(async (tx) => {
    const user = await readUser(tx, uid);
    const pRef = petRef(uid, user.activePetId);
    const petSnap = await tx.get(pRef);
    if (user.coins < food.price) throw new ApiError(402, "not_enough_coins");

    const before = petSnap.exists
      ? applyDecay(petSnap.data() as PetDoc, now)
      : newPet(DEFAULT_SPECIES_ID, PET_SPECIES[DEFAULT_SPECIES_ID].name, now);
    const after = feedPet(before, food);

    tx.set(pRef, after);
    tx.update(userRef(uid), { coins: FieldValue.increment(-food.price), updatedAt: now });
    return {
      pet: toPublicPet(user.activePetId, after),
      coins: user.coins - food.price,
      leveledUp: after.level > before.level,
    };
  });
}

/* ------------------------------------------------------------------------- */
/* ลบบัญชี                                                                     */
/* ------------------------------------------------------------------------- */

export async function deleteAccount(uid: string): Promise<void> {
  // ลบข้อมูลทั้งหมดใต้ users/{uid} (รวม subcollections) แล้วลบบัญชีใน Firebase Auth
  await db().recursiveDelete(userRef(uid));
  await adminAuth().deleteUser(uid);
}
