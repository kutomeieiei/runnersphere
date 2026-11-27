import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { GAME_CONFIG, type LatLng } from "@/config/game";
import { findAreaAt } from "@/lib/areas";
import { loadEffectiveAreas } from "./areas-store";
import {
  DEFAULT_SPECIES_ID,
  PET_CONFIG,
  PET_SPECIES,
  findAccessory,
  findFood,
  findSpecies,
  type AccessorySlot,
} from "@/config/pets";
import type {
  CheckResponse,
  DailyStats,
  FeedResponse,
  LeaderboardResponse,
  MeResponse,
  MissionHistoryItem,
  PetActionResponse,
  PetSummary,
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
import { containsBlockedWord, rankEntries, type LeaderboardEntry } from "@/lib/leaderboard";
import { calcCoins, minTravelMs, selectSpot } from "@/lib/missions";
import { applyDecay, feedPet, newPet, petMood, rewardPetForMission, type PetState } from "@/lib/pet";
import { adoptVerdict, buyVerdict, equip, unequip } from "@/lib/wardrobe";
import {
  dateKey,
  isWithinPlayHours,
  lastNDateKeys,
  weekDateKeysSoFar,
  weekEndKey,
  weekStartKey,
} from "@/lib/time";
import { adminAuth, db } from "./firebase-admin";
import { ApiError } from "./http";

/* ---------------------------------------------------------------------------
 * Firestore data model
 *
 *   users/{uid}                     UserDoc   (โปรไฟล์ เหรียญ ภารกิจปัจจุบัน ยอดรวม)
 *   users/{uid}/pets/{petId}        PetDoc    (สัตว์เลี้ยงทุกตัวที่รับเลี้ยง: "main" = ตัวแรก, ตัวอื่น id = speciesId)
 *   users/{uid}/missions/{id}       MissionDoc (ผลลัพธ์ภารกิจ — ไม่เก็บเส้นทางเดิน)
 *   users/{uid}/daily/{YYYY-MM-DD}  DailyStats (สถิติรายวัน)
 *   leaderboard/{วันจันทร์ YYYY-MM-DD}/entries/{uid}
 *                                   EntryDoc  (กระดานอันดับรายสัปดาห์: ชื่อเล่น + ตัวเลขเท่านั้น)
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
  /** แสดงชื่อในกระดานอันดับหรือไม่ (ไม่มีค่า = ใช้ค่าเริ่มต้นใน config) */
  leaderboardVisible?: boolean;
  /** สัปดาห์ที่เคยมีชื่อในกระดาน — ใช้ลบข้อมูลเมื่อซ่อนชื่อหรือลบบัญชี */
  leaderboardWeeks?: string[];
  /** ของแต่งตัวที่ซื้อแล้ว (id) — ใช้ได้กับสัตว์เลี้ยงทุกตัว */
  inventory?: string[];
  createdAt: number;
  updatedAt: number;
};

type EntryDoc = { nickname: string; spots: number; distanceM: number; updatedAt: number };

type PetDoc = PetState;

type MissionStatus = "active" | "completed" | "cancelled" | "expired" | "flagged";

type MissionDoc = MissionCheckState & {
  /** พื้นที่เล่นของภารกิจนี้ (ภารกิจเก่าก่อนมีหลายพื้นที่จะไม่มีค่านี้) */
  areaId?: string;
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
const petsCol = (uid: string) => userRef(uid).collection("pets");
const petRef = (uid: string, petId: string) => petsCol(uid).doc(petId);
/** ตัวแรกใช้ id "main" (ข้อมูลเดิม) ตัวที่รับเลี้ยงภายหลังใช้ speciesId เป็น id */
const petIdFor = (speciesId: string) => (speciesId === DEFAULT_SPECIES_ID ? MAIN_PET_ID : speciesId);

function toSummaries(docs: { id: string; data: PetDoc }[], activeId: string): PetSummary[] {
  return docs
    .map(({ id, data }) => ({ id, speciesId: data.speciesId, name: data.name, level: data.level, active: id === activeId }))
    .sort((a, b) => (findSpecies(a.speciesId)?.unlockLevel ?? 0) - (findSpecies(b.speciesId)?.unlockLevel ?? 0));
}
const missionsCol = (uid: string) => userRef(uid).collection("missions");
const dailyRef = (uid: string, key: string) => userRef(uid).collection("daily").doc(key);
const entriesCol = (week: string) => db().collection("leaderboard").doc(week).collection("entries");
const entryRef = (week: string, uid: string) => entriesCol(week).doc(uid);

function isVisible(user: UserDoc): boolean {
  return user.leaderboardVisible ?? GAME_CONFIG.leaderboard.defaultVisible;
}

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
    areaId: m.areaId ?? null,
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
  if (containsBlockedWord(cleaned, GAME_CONFIG.profile.blockedWords)) {
    throw new ApiError(400, "nickname_blocked");
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
      // เปลี่ยนชื่อในกระดานสัปดาห์นี้ด้วย (ถ้ามีชื่ออยู่)
      const eRef = entryRef(weekStartKey(now), uid);
      const entry = await tx.get(eRef);
      tx.update(ref, { nickname, updatedAt: now });
      if (entry.exists) tx.update(eRef, { nickname });
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
      leaderboardVisible: GAME_CONFIG.leaderboard.defaultVisible,
      leaderboardWeeks: [],
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
  const keys = lastNDateKeys(now, 7);
  // อ่านพร้อมกันในรอบเดียว (ลดจำนวนรอบที่ต้องคุยกับ Firestore)
  const [snap, petsSnap, dailySnaps] = await Promise.all([
    userRef(uid).get(),
    petsCol(uid).get(),
    db().getAll(...keys.map((k) => dailyRef(uid, k))),
  ]);
  if (!snap.exists) throw new ApiError(404, "profile_missing");
  const user = snap.data() as UserDoc;
  const missionSnap = user.activeMissionId ? await missionsCol(uid).doc(user.activeMissionId).get() : null;

  const pets = petsSnap.docs.map((d) => ({ id: d.id, data: d.data() as PetDoc }));
  const activeDoc = pets.find((p) => p.id === user.activePetId);
  const petRaw = activeDoc
    ? activeDoc.data
    : newPet(DEFAULT_SPECIES_ID, PET_SPECIES[DEFAULT_SPECIES_ID].name, now);
  // เฉพาะตัวที่ออกเดินด้วยเท่านั้นที่ค่าลดตามเวลา ตัวอื่น "พักอยู่บ้าน"
  const pet = applyDecay(petRaw, now);

  let activeMission: PublicMission | null = null;
  if (missionSnap?.exists) {
    const m = missionSnap.data() as MissionDoc;
    if (m.status === "active" && m.expiresAt > now) activeMission = toPublicMission(missionSnap.id, m);
  }

  const week = dailySnaps.map((s, i) =>
    s.exists ? { ...emptyDaily(keys[i]), ...(s.data() as DailyStats) } : emptyDaily(keys[i]),
  );

  return {
    profile: {
      nickname: user.nickname,
      coins: user.coins,
      totals: user.totals,
      leaderboardVisible: isVisible(user),
    },
    pet: toPublicPet(user.activePetId, pet),
    pets: toSummaries(pets.length ? pets : [{ id: user.activePetId, data: pet }], user.activePetId),
    bestLevel: Math.max(pet.level, ...pets.map((p) => p.data.level)),
    inventory: user.inventory ?? [],
    activeMission,
    today: week[week.length - 1],
    week,
    serverTime: now,
  };
}

export async function getStats(uid: string): Promise<StatsResponse> {
  const now = Date.now();
  const keys = lastNDateKeys(now, 28);
  const [snap, dailySnaps, recentSnap] = await Promise.all([
    userRef(uid).get(),
    db().getAll(...keys.map((k) => dailyRef(uid, k))),
    missionsCol(uid).orderBy("startedAt", "desc").limit(10).get(),
  ]);
  if (!snap.exists) throw new ApiError(404, "profile_missing");
  const user = snap.data() as UserDoc;
  const days = dailySnaps.map((s, i) =>
    s.exists ? { ...emptyDaily(keys[i]), ...(s.data() as DailyStats) } : emptyDaily(keys[i]),
  );
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
  // พื้นที่ที่ใช้จริง (config + กรอบ/จุดที่แก้จากเครื่องมือแก้แผนที่)
  const areas = await loadEffectiveAreas();

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
    // ตัดสินพื้นที่จากตำแหน่งจริงเท่านั้น (ไม่เชื่อพื้นที่ที่ client เลือก)
    const area = findAreaAt(player, areas);
    if (!area) throw new ApiError(403, "outside_geofence");

    const picked = selectSpot({
      spots: area.spots,
      player,
      geofence: area.polygon,
      lastSpotId: user.lastSpotId,
    });
    if (!picked) throw new ApiError(409, "no_spot");

    const { spot, distanceM } = picked;
    const radiusM = cfg.arrival.radiusM;
    const startSample: SpeedSample = { ...player, accuracy: reading.accuracy, timestamp: reading.timestamp, serverAt: now };
    const mission: MissionDoc = {
      areaId: area.id,
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

    // กระดานอันดับรายสัปดาห์ (เฉพาะผู้ที่เลือกแสดงชื่อ)
    const onBoard = GAME_CONFIG.leaderboard.enabled && isVisible(user);
    const week = weekStartKey(now);
    if (onBoard) {
      tx.set(
        entryRef(week, uid),
        {
          nickname: user.nickname,
          spots: FieldValue.increment(1),
          distanceM: FieldValue.increment(distanceM),
          updatedAt: now,
        },
        { merge: true },
      );
    }

    tx.update(userRef(uid), {
      ...(onBoard ? { leaderboardWeeks: FieldValue.arrayUnion(week) } : {}),
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
  // ลบชื่อในกระดานอันดับทุกสัปดาห์ แล้วลบข้อมูลทั้งหมดใต้ users/{uid} (รวม subcollections)
  // แล้วลบบัญชีใน Firebase Auth
  const snap = await userRef(uid).get();
  const weeks = snap.exists ? ((snap.data() as UserDoc).leaderboardWeeks ?? []) : [];
  weeks.push(weekStartKey(Date.now()));
  const batch = db().batch();
  for (const w of new Set(weeks)) batch.delete(entryRef(w, uid));
  await batch.commit();
  await db().recursiveDelete(userRef(uid));
  await adminAuth().deleteUser(uid);
}

/* ------------------------------------------------------------------------- */
/* กระดานอันดับรายสัปดาห์                                                       */
/* ------------------------------------------------------------------------- */

function requireLeaderboard() {
  if (!GAME_CONFIG.leaderboard.enabled) throw new ApiError(404, "leaderboard_disabled");
}

async function weekTotals(uid: string, now: number) {
  const snaps = await db().getAll(...weekDateKeysSoFar(now).map((k) => dailyRef(uid, k)));
  return snaps.reduce(
    (acc, s) => {
      const d = s.exists ? (s.data() as DailyStats) : null;
      return { spots: acc.spots + (d?.spots ?? 0), distanceM: acc.distanceM + (d?.distanceM ?? 0) };
    },
    { spots: 0, distanceM: 0 },
  );
}

export async function getLeaderboard(uid: string): Promise<LeaderboardResponse> {
  requireLeaderboard();
  const now = Date.now();
  const week = weekStartKey(now);
  const col = entriesCol(week);
  const topN = GAME_CONFIG.leaderboard.topN;

  // ดึงเผื่อไว้มากกว่า topN เพื่อให้เรียงคะแนนเท่ากันได้ถูก (ใช้ index ช่องเดียว ไม่ต้องสร้าง composite index)
  const [userSnap, topSnap, totalAgg, mine] = await Promise.all([
    userRef(uid).get(),
    col.orderBy("spots", "desc").limit(topN * 2 + 10).get(),
    col.where("spots", ">", 0).count().get(),
    entryRef(week, uid).get(),
  ]);
  if (!userSnap.exists) throw new ApiError(404, "profile_missing");
  const user = userSnap.data() as UserDoc;
  const entries: LeaderboardEntry[] = topSnap.docs.map((d) => ({ id: d.id, ...(d.data() as EntryDoc) }));
  const top = rankEntries(entries)
    .slice(0, topN)
    .map((e) => ({
      rank: e.rank,
      nickname: e.nickname,
      spots: e.spots,
      distanceM: Math.round(e.distanceM),
      isMe: e.id === uid,
    }));

  const visible = isVisible(user);
  let me: LeaderboardResponse["me"];
  if (visible) {
    const data = mine.exists ? (mine.data() as EntryDoc) : null;
    let rank: number | null = null;
    if (data && data.spots > 0) {
      const higher = await col.where("spots", ">", data.spots).count().get();
      rank = higher.data().count + 1;
    }
    me = { visible, rank, spots: data?.spots ?? 0, distanceM: Math.round(data?.distanceM ?? 0) };
  } else {
    const totals = await weekTotals(uid, now);
    me = { visible, rank: null, spots: totals.spots, distanceM: Math.round(totals.distanceM) };
  }

  return {
    weekStart: week,
    weekEnd: weekEndKey(now),
    totalPlayers: totalAgg.data().count,
    top,
    me,
  };
}

/** เปิด/ปิดการแสดงชื่อในกระดานอันดับ — ปิดแล้วลบชื่อออกจากทุกสัปดาห์ทันที */
export async function setLeaderboardVisible(uid: string, visible: unknown): Promise<{ visible: boolean }> {
  if (typeof visible !== "boolean") throw new ApiError(400, "invalid_input");
  const now = Date.now();
  const week = weekStartKey(now);
  const totals = visible ? await weekTotals(uid, now) : null;

  return db().runTransaction(async (tx) => {
    const user = await readUser(tx, uid);
    if (visible) {
      if (totals && totals.spots > 0) {
        tx.set(entryRef(week, uid), {
          nickname: user.nickname,
          spots: totals.spots,
          distanceM: totals.distanceM,
          updatedAt: now,
        } satisfies EntryDoc);
      }
      tx.update(userRef(uid), {
        leaderboardVisible: true,
        ...(totals && totals.spots > 0 ? { leaderboardWeeks: FieldValue.arrayUnion(week) } : {}),
        updatedAt: now,
      });
    } else {
      for (const w of new Set([...(user.leaderboardWeeks ?? []), week])) tx.delete(entryRef(w, uid));
      tx.update(userRef(uid), { leaderboardVisible: false, leaderboardWeeks: [], updatedAt: now });
    }
    return { visible };
  });
}

/* ------------------------------------------------------------------------- */
/* สัตว์เลี้ยงหลายตัว + ของแต่งตัว                                                */
/* ------------------------------------------------------------------------- */

/** เลือกตัวที่ออกเดินด้วย: สลับไปตัวที่มีอยู่ หรือรับเลี้ยงชนิดที่ปลดล็อกแล้ว */
export async function setActivePet(uid: string, speciesId: unknown): Promise<PetActionResponse> {
  if (typeof speciesId !== "string") throw new ApiError(400, "invalid_input");
  const now = Date.now();
  return db().runTransaction(async (tx) => {
    const user = await readUser(tx, uid);
    const petsSnap = await tx.get(petsCol(uid));
    const pets = petsSnap.docs.map((d) => ({ id: d.id, data: d.data() as PetDoc }));
    const bestLevel = Math.max(1, ...pets.map((p) => p.data.level));
    const verdict = adoptVerdict(speciesId, bestLevel, pets.map((p) => p.data.speciesId));
    if (verdict === "unknown") throw new ApiError(400, "unknown_species");
    if (verdict === "locked") throw new ApiError(403, "species_locked");

    const current = pets.find((p) => p.id === user.activePetId);
    const targetId = verdict === "switch" ? pets.find((p) => p.data.speciesId === speciesId)!.id : petIdFor(speciesId);
    if (current && current.id === targetId) return { activePetId: targetId, coins: user.coins };

    // ตัวเดิม: คิดค่าลดถึงตอนนี้แล้วพักไว้
    if (current) tx.set(petRef(uid, current.id), applyDecay(current.data, now));
    if (verdict === "switch") {
      // ตัวที่พักอยู่บ้าน: ค่าไม่ลดระหว่างพัก เริ่มนับใหม่จากตอนนี้
      tx.update(petRef(uid, targetId), { updatedAt: now });
    } else {
      const species = findSpecies(speciesId)!;
      tx.create(petRef(uid, targetId), newPet(species.id, species.name, now));
    }
    tx.update(userRef(uid), { activePetId: targetId, updatedAt: now });
    return { activePetId: targetId, coins: user.coins };
  });
}

/** ซื้อ / ใส่ / ถอด ของแต่งตัว (ซื้อแล้วใส่ให้ตัวปัจจุบันทันที) */
export async function accessoryAction(
  uid: string,
  body: { action?: unknown; accessoryId?: unknown; slot?: unknown },
): Promise<PetActionResponse> {
  const now = Date.now();
  const action = body?.action;
  if (action !== "buy" && action !== "equip" && action !== "unequip") throw new ApiError(400, "invalid_input");

  return db().runTransaction(async (tx) => {
    const user = await readUser(tx, uid);
    const pRef = petRef(uid, user.activePetId);
    const petSnap = await tx.get(pRef);
    const pet = petSnap.exists
      ? (petSnap.data() as PetDoc)
      : newPet(DEFAULT_SPECIES_ID, PET_SPECIES[DEFAULT_SPECIES_ID].name, now);
    const inventory = user.inventory ?? [];

    if (action === "unequip") {
      const slot = body.slot as AccessorySlot;
      if (slot !== "head" && slot !== "neck" && slot !== "face") throw new ApiError(400, "invalid_input");
      tx.set(pRef, { ...pet, equipped: unequip(pet.equipped, slot) });
      return { activePetId: user.activePetId, coins: user.coins };
    }

    const item = typeof body.accessoryId === "string" ? findAccessory(body.accessoryId) : undefined;
    if (!item) throw new ApiError(400, "unknown_accessory");

    if (action === "buy") {
      const verdict = buyVerdict(item.id, inventory, user.coins);
      if (verdict === "owned") throw new ApiError(409, "already_owned");
      if (verdict === "not_enough_coins") throw new ApiError(402, "not_enough_coins");
      tx.update(userRef(uid), {
        coins: FieldValue.increment(-item.price),
        inventory: FieldValue.arrayUnion(item.id),
        updatedAt: now,
      });
      tx.set(pRef, { ...pet, equipped: equip(pet.equipped, item) });
      return { activePetId: user.activePetId, coins: user.coins - item.price };
    }

    if (!inventory.includes(item.id)) throw new ApiError(403, "accessory_not_owned");
    tx.set(pRef, { ...pet, equipped: equip(pet.equipped, item) });
    return { activePetId: user.activePetId, coins: user.coins };
  });
}
