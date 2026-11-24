import type { LatLng } from "@/config/game";
import type { CheckOutcome } from "./arrival";
import type { PetMood, PetState } from "./pet";

export type DailyStats = {
  date: string;
  spots: number;
  distanceM: number;
  coins: number;
};

export type PublicMission = {
  id: string;
  spotId: string;
  spotName: string;
  spotHint?: string | null;
  target: LatLng;
  radiusM: number;
  startedAt: number;
  expiresAt: number;
  coinsReward: number;
  plannedDistanceM: number;
  consecutive: number;
  required: number;
};

export type PublicPet = PetState & { id: string; mood: PetMood; xpToNext: number };

export type ProfileSummary = {
  nickname: string;
  coins: number;
  totals: { spots: number; distanceM: number; coinsEarned: number };
  leaderboardVisible: boolean;
};

export type PetSummary = {
  id: string;
  speciesId: string;
  name: string;
  level: number;
  /** ตัวที่กำลังออกเดินด้วย */
  active: boolean;
};

export type PetActionResponse = { activePetId: string; coins: number };

export type MeResponse = {
  profile: ProfileSummary;
  /** ตัวที่กำลังออกเดินด้วย */
  pet: PublicPet;
  /** สัตว์เลี้ยงทุกตัวที่มี */
  pets: PetSummary[];
  /** เลเวลสูงสุดในบรรดาสัตว์เลี้ยงทั้งหมด (ใช้ปลดล็อกชนิดใหม่) */
  bestLevel: number;
  /** ของแต่งตัวที่ซื้อแล้ว */
  inventory: string[];
  activeMission: PublicMission | null;
  today: DailyStats;
  week: DailyStats[];
  serverTime: number;
};

export type StartMissionResponse = {
  mission: PublicMission;
  resumed: boolean;
};

export type CheckResponse = {
  outcome: CheckOutcome;
  distanceM: number | null;
  consecutive: number;
  required: number;
  retryAfterMs?: number;
  /** มีเมื่อ outcome = arrived */
  reward?: {
    coins: number;
    totalCoins: number;
    petLeveledUp: boolean;
    today: DailyStats;
    restReminder: boolean;
    dailyCapReached: boolean;
  };
};

export type FeedResponse = {
  pet: PublicPet;
  coins: number;
  leveledUp: boolean;
};

export type MissionHistoryItem = {
  id: string;
  spotName: string;
  status: string;
  startedAt: number;
  endedAt: number | null;
  coinsAwarded: number;
  distanceM: number;
};

export type StatsResponse = {
  days: DailyStats[];
  recent: MissionHistoryItem[];
  totals: ProfileSummary["totals"];
};

export type LeaderboardRow = {
  rank: number;
  nickname: string;
  spots: number;
  distanceM: number;
  isMe: boolean;
};

export type LeaderboardResponse = {
  /** วันจันทร์–อาทิตย์ของสัปดาห์นี้ (YYYY-MM-DD) */
  weekStart: string;
  weekEnd: string;
  /** จำนวนผู้เล่นที่มีชื่อในกระดานสัปดาห์นี้ */
  totalPlayers: number;
  top: LeaderboardRow[];
  me: { visible: boolean; rank: number | null; spots: number; distanceM: number };
};
