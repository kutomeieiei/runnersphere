"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { GAME_CONFIG } from "@/config/game";
import { classifyAccuracy, type AccuracyLevel } from "@/lib/arrival";
import { moveTowards, offsetM } from "@/lib/geo";
import { mockGps, type MockState } from "@/lib/mock-gps";

export type GeoFix = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  heading: number | null;
  source: "gps" | "mock";
};

export type GeoStatus =
  | "idle"
  | "requesting"
  | "watching"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "insecure";

type GeoContextValue = {
  status: GeoStatus;
  fix: GeoFix | null;
  accuracyLevel: AccuracyLevel | null;
  /** fix ล่าสุดเก่าเกินไป (ไม่ได้รับตำแหน่งใหม่นาน) */
  stale: boolean;
  start: () => void;
  /** ขอตำแหน่งใหม่ทันที (ใช้เมื่อยืนนิ่งแล้ว watchPosition ไม่ส่งค่าใหม่) */
  requestFresh: () => void;
  mock: MockState;
};

const GeoContext = createContext<GeoContextValue | null>(null);

const MOCK_INTERVAL_MS = 1500;
const STALE_AFTER_MS = 30_000;

export function GeoProvider({ children, active }: { children: React.ReactNode; active: boolean }) {
  const mock = useSyncExternalStore(mockGps.subscribe, mockGps.get, mockGps.getServer);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [wanted, setWanted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => setWanted(true), []);
  const freshInflight = useRef(false);

  const requestFresh = useCallback(() => {
    if (mockGps.get().enabled) return; // mock ส่งค่าใหม่ทุก 1.5 วินาทีอยู่แล้ว
    if (freshInflight.current || typeof navigator === "undefined" || !navigator.geolocation) return;
    freshInflight.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        freshInflight.current = false;
        setStatus((s) => (s === "denied" ? s : "watching"));
        setFix((prev) =>
          prev && prev.timestamp >= pos.timestamp
            ? prev
            : {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: pos.timestamp,
                heading: pos.coords.heading ?? null,
                source: "gps",
              },
        );
      },
      () => {
        freshInflight.current = false;
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
    );
  }, []);

  // ---------- ตำแหน่งจริง: watchPosition ----------
  useEffect(() => {
    if (!active || !wanted || mock.enabled) return;
    if (typeof window === "undefined") return;
    if (!window.isSecureContext) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("insecure");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus((s) => (s === "watching" ? s : "requesting"));
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("watching");
        setFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
          heading: pos.coords.heading ?? null,
          source: "gps",
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setFix(null);
        }
        else if (err.code === err.TIMEOUT) setStatus("timeout");
        else setStatus("unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );

    // ถ้าผู้ใช้เปลี่ยนสิทธิ์ภายหลัง (เช่น เปิดอนุญาตในการตั้งค่า) ให้ลองใหม่
    let permStatus: PermissionStatus | null = null;
    const onPermChange = () => {
      if (permStatus?.state === "denied") setStatus("denied");
      else if (permStatus?.state === "granted") setStatus((s) => (s === "denied" ? "requesting" : s));
    };
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        permStatus = p;
        p.addEventListener("change", onPermChange);
      })
      .catch(() => undefined);

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      permStatus?.removeEventListener("change", onPermChange);
    };
  }, [active, wanted, mock.enabled]);

  // ---------- Mock GPS ----------
  useEffect(() => {
    if (!active || !wanted || !mock.enabled) return;
    const tick = () => {
      const s = mockGps.get();
      if (s.mode !== "ok") {
        setStatus(s.mode === "denied" ? "denied" : "unavailable");
        setFix(null);
        return;
      }
      let position = s.position;
      if (s.walkTarget) {
        position = moveTowards(s.position, s.walkTarget, (s.speedMps * MOCK_INTERVAL_MS) / 1000);
        const arrived = position.lat === s.walkTarget.lat && position.lng === s.walkTarget.lng;
        mockGps.set({ position, walkTarget: arrived ? null : s.walkTarget });
      }
      const jittered = s.jitter
        ? offsetM(position, Math.random() * 360, Math.random() * Math.min(s.accuracy, 30) * 0.3)
        : position;
      setStatus("watching");
      setFix({
        ...jittered,
        accuracy: s.jitter ? Math.max(1, s.accuracy + (Math.random() - 0.5) * 2) : s.accuracy,
        timestamp: Date.now(),
        heading: null,
        source: "mock",
      });
    };
    tick();
    const id = window.setInterval(tick, MOCK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, wanted, mock.enabled]);

  // ล้างตำแหน่งเมื่อสลับโหมด
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFix(null);
  }, [mock.enabled]);

  // นาฬิกาสำหรับตรวจว่าตำแหน่งเก่า
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo<GeoContextValue>(
    () => ({
      status,
      fix,
      accuracyLevel: fix ? classifyAccuracy(fix.accuracy, GAME_CONFIG.arrival) : null,
      stale: fix ? now - fix.timestamp > STALE_AFTER_MS : false,
      start,
      requestFresh,
      mock,
    }),
    [status, fix, now, start, requestFresh, mock],
  );

  return <GeoContext.Provider value={value}>{children}</GeoContext.Provider>;
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error("useGeo must be used inside GeoProvider");
  return ctx;
}
