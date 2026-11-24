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
};

export type MeResponse = {
  profile: ProfileSummary;
  pet: PublicPet;
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
