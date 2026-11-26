"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GAME_CONFIG } from "@/config/game";
import type {
  CheckResponse,
  FeedResponse,
  MeResponse,
  StartMissionResponse,
} from "@/lib/api-types";
import { api, ApiClientError } from "@/lib/api-client";
import { haversineM } from "@/lib/geo";
import { PENDING_NICKNAME_KEY } from "@/lib/storage-keys";
import { useGeo } from "./GeoProvider";

export type Reward = NonNullable<CheckResponse["reward"]> & { spotName: string };

type GameContextValue = {
  me: MeResponse | null;
  loading: boolean;
  error: ApiClientError | null;
  /** ต้องตั้งชื่อเล่นก่อน (สร้างโปรไฟล์ไม่สำเร็จตอนสมัคร) */
  needsProfile: boolean;
  createProfile: (nickname: string) => Promise<void>;
  refresh: () => Promise<void>;
  startMission: () => Promise<void>;
  cancelMission: () => Promise<void>;
  feed: (foodId: string) => Promise<FeedResponse>;
  updateNickname: (nickname: string) => Promise<void>;
  starting: boolean;
  actionError: ApiClientError | null;
  clearActionError: () => void;
  lastCheck: CheckResponse | null;
  reward: Reward | null;
  dismissReward: () => void;
  /** ข้อความสั้นๆ เมื่อภารกิจจบโดยไม่ได้รางวัล (หมดเวลา / ถูกจับความเร็ว) */
  missionNotice: string | null;
  dismissMissionNotice: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

/** ส่งตรวจถี่ขึ้นเมื่อใกล้จุด และห่างลงเมื่ออยู่ไกล (ประหยัด request) */
const NEAR_INTERVAL_MS = Math.max(GAME_CONFIG.arrival.minCheckIntervalMs + 500, 3000);
const FAR_INTERVAL_MS = 15_000;

export function GameProvider({ children }: { children: React.ReactNode }) {
  const geo = useGeo();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState<ApiClientError | null>(null);
  const [lastCheck, setLastCheck] = useState<CheckResponse | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [missionNotice, setMissionNotice] = useState<string | null>(null);

  const inflight = useRef(false);
  const lastSentAt = useRef(0);
  const lastSentFixTs = useRef(0);
  const holdUntil = useRef(0);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api<MeResponse>("/api/me");
      setMe(data);
      setError(null);
      setNeedsProfile(false);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "profile_missing") {
        // ลองสร้างโปรไฟล์จากชื่อเล่นที่กรอกไว้ตอนสมัคร
        let pending: string | null = null;
        try {
          pending = sessionStorage.getItem(PENDING_NICKNAME_KEY);
        } catch {}
        if (pending) {
          try {
            await api("/api/profile", { method: "POST", body: { nickname: pending } });
            sessionStorage.removeItem(PENDING_NICKNAME_KEY);
            setMe(await api<MeResponse>("/api/me"));
            setError(null);
            return;
          } catch {}
        }
        setNeedsProfile(true);
        setError(null);
      } else {
        setError(err instanceof ApiClientError ? err : new ApiClientError("internal", 0));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // โหลดใหม่เมื่อกลับมาออนไลน์ หรือกลับมาที่แท็บ
  useEffect(() => {
    const onOnline = () => void refresh();
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const createProfile = useCallback(
    async (nickname: string) => {
      await api("/api/profile", { method: "POST", body: { nickname } });
      await refresh();
    },
    [refresh],
  );

  const updateNickname = useCallback(
    async (nickname: string) => {
      await api("/api/profile", { method: "POST", body: { nickname } });
      setMe((m) => (m ? { ...m, profile: { ...m.profile, nickname: nickname.trim() } } : m));
    },
    [],
  );

  const startMission = useCallback(async () => {
    const fix = geo.fix;
    setActionError(null);
    if (!fix) {
      setActionError(new ApiClientError("poor_accuracy", 0));
      return;
    }
    setStarting(true);
    try {
      const res = await api<StartMissionResponse>("/api/missions/start", {
        method: "POST",
        body: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, timestamp: fix.timestamp },
      });
      setLastCheck(null);
      lastSentAt.current = Date.now();
      setMe((m) => (m ? { ...m, activeMission: res.mission } : m));
    } catch (err) {
      if (err instanceof ApiClientError) setActionError(err);
    } finally {
      setStarting(false);
    }
  }, [geo.fix]);

  const cancelMission = useCallback(async () => {
    try {
      await api("/api/missions/cancel", { method: "POST" });
      setLastCheck(null);
      setMe((m) => (m ? { ...m, activeMission: null } : m));
    } catch (err) {
      if (err instanceof ApiClientError) setActionError(err);
    }
  }, []);

  const feed = useCallback(async (foodId: string) => {
    const res = await api<FeedResponse>("/api/pet/feed", { method: "POST", body: { foodId } });
    setMe((m) => (m ? { ...m, pet: res.pet, profile: { ...m.profile, coins: res.coins } } : m));
    return res;
  }, []);

  // ---------- ส่งตำแหน่งไปตรวจที่ server ระหว่างทำภารกิจ ----------
  const mission = me?.activeMission ?? null;
  const fix = geo.fix;
  const { requestFresh } = geo;

  // นาฬิกาเดินทุก 1 วินาทีระหว่างทำภารกิจ เพื่อให้ตรวจซ้ำได้แม้ตำแหน่งไม่เปลี่ยน
  useEffect(() => {
    if (!mission) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [mission]);

  useEffect(() => {
    if (!mission || !fix || inflight.current) return;
    const now = Date.now();
    if (now < holdUntil.current) return;
    const clientDistance = haversineM(fix, mission.target);
    const near = clientDistance <= mission.radiusM + Math.max(fix.accuracy, 20) + 15;
    const interval = near ? NEAR_INTERVAL_MS : FAR_INTERVAL_MS;
    if (now - lastSentAt.current < interval) return;

    // ห้ามส่งตำแหน่งเดิมซ้ำ (server จะไม่นับ) — ถ้ายืนนิ่งอยู่ใกล้จุด ขอค่าใหม่จาก GPS
    if (fix.timestamp <= lastSentFixTs.current) {
      if (near) requestFresh();
      return;
    }

    inflight.current = true;
    lastSentAt.current = now;
    lastSentFixTs.current = fix.timestamp;
    api<CheckResponse>("/api/missions/check", {
      method: "POST",
      body: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, timestamp: fix.timestamp },
    })
      .then((res) => {
        setLastCheck(res);
        if (res.outcome === "rate_limited" && res.retryAfterMs) {
          holdUntil.current = Date.now() + res.retryAfterMs;
        }
        if (res.outcome === "arrived" && res.reward) {
          setReward({ ...res.reward, spotName: mission.spotName });
          setMe((m) =>
            m
              ? {
                  ...m,
                  activeMission: null,
                  today: res.reward!.today,
                  profile: { ...m.profile, coins: res.reward!.totalCoins },
                }
              : m,
          );
          void refresh();
        } else if (res.outcome === "expired" || res.outcome === "flagged") {
          setMissionNotice(
            res.outcome === "expired"
              ? "ภารกิจหมดเวลาแล้ว ไม่เป็นไรนะ เริ่มภารกิจใหม่ได้เลย"
              : "ระบบตรวจพบการเคลื่อนที่เร็วผิดปกติหลายครั้ง ภารกิจนี้จึงถูกยกเลิก (ถ้า GPS กระโดด ลองเริ่มใหม่ในที่โล่ง)",
          );
          setMe((m) => (m ? { ...m, activeMission: null } : m));
        } else {
          setMe((m) =>
            m?.activeMission
              ? { ...m, activeMission: { ...m.activeMission, consecutive: res.consecutive } }
              : m,
          );
        }
      })
      .catch((err) => {
        if (err instanceof ApiClientError && err.code === "no_active_mission") {
          setMe((m) => (m ? { ...m, activeMission: null } : m));
        }
        // ออฟไลน์/ผิดพลาดชั่วคราว: รอบถัดไปจะส่งใหม่อัตโนมัติ
      })
      .finally(() => {
        inflight.current = false;
      });
  }, [mission, fix, refresh, requestFresh, tick]);

  const value = useMemo<GameContextValue>(
    () => ({
      me,
      loading,
      error,
      needsProfile,
      createProfile,
      refresh,
      startMission,
      cancelMission,
      feed,
      updateNickname,
      starting,
      actionError,
      clearActionError: () => setActionError(null),
      lastCheck,
      reward,
      dismissReward: () => setReward(null),
      missionNotice,
      dismissMissionNotice: () => setMissionNotice(null),
    }),
    [
      me,
      loading,
      error,
      needsProfile,
      createProfile,
      refresh,
      startMission,
      cancelMission,
      feed,
      updateNickname,
      starting,
      actionError,
      lastCheck,
      reward,
      missionNotice,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}
