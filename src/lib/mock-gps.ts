"use client";

import type { LatLng } from "@/config/game";
import { DEFAULT_AREA, areaCenter } from "./areas";
import { MOCK_GPS_KEY } from "./storage-keys";

/**
 * Mock GPS (โหมดนักพัฒนา) — จำลองตำแหน่งเพื่อทดสอบบนคอมพิวเตอร์
 * เปิดใช้ได้เมื่อรัน dev หรือตั้ง NEXT_PUBLIC_ENABLE_MOCK_GPS=true
 * ⚠️ ควรปิดใน production จริง เพราะทำให้ผู้เล่นปลอมตำแหน่งผ่าน UI ได้ง่าย
 *    (server ยังตรวจความเร็ว/เวลาอยู่ ดังนั้นการ "วาร์ป" จะถูกจับได้)
 */
export const MOCK_GPS_AVAILABLE =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_MOCK_GPS === "true";

export type MockMode = "ok" | "denied" | "unavailable";

export type MockState = {
  enabled: boolean;
  position: LatLng;
  accuracy: number;
  mode: MockMode;
  /** เดินอัตโนมัติไปยังตำแหน่งนี้ */
  walkTarget: LatLng | null;
  speedMps: number;
  /** สุ่มความคลาดเคลื่อนเล็กน้อยเหมือน GPS จริง */
  jitter: boolean;
};

const DEFAULT_STATE: MockState = {
  enabled: false,
  position: areaCenter(DEFAULT_AREA),
  accuracy: 8,
  mode: "ok",
  walkTarget: null,
  speedMps: 1.4,
  jitter: true,
};

let state: MockState = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(MOCK_GPS_KEY);
    if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(raw), walkTarget: null, mode: "ok" };
  } catch {}
}

function persist() {
  try {
    const { enabled, position, accuracy, speedMps, jitter } = state;
    localStorage.setItem(MOCK_GPS_KEY, JSON.stringify({ enabled, position, accuracy, speedMps, jitter }));
  } catch {}
}

export const mockGps = {
  get(): MockState {
    load();
    return MOCK_GPS_AVAILABLE ? state : DEFAULT_STATE;
  },
  getServer(): MockState {
    return DEFAULT_STATE;
  },
  set(patch: Partial<MockState>) {
    if (!MOCK_GPS_AVAILABLE) return;
    load();
    state = { ...state, ...patch };
    persist();
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
