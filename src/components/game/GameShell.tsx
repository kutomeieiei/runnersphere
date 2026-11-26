"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GameMap } from "@/components/map/GameMap";
import { useGame } from "@/components/providers/GameProvider";
import { useGeo } from "@/components/providers/GeoProvider";
import type { PlayArea } from "@/config/game";
import { DEFAULT_AREA, areaById, findAreaAt } from "@/lib/areas";
import { mockGps } from "@/lib/mock-gps";
import { AREA_KEY, HELP_SEEN_KEY } from "@/lib/storage-keys";
import { BottomNav } from "./BottomNav";
import { HelpModal } from "./HelpModal";
import { OfflineBanner } from "./OfflineBanner";
import { ProfileSetup } from "./ProfileSetup";
import { RewardModal } from "./RewardModal";
import { SafetyGate } from "./SafetyGate";

type ShellContextValue = {
  recenter: () => void;
  helpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  /** เปิดวิธีเล่นอัตโนมัติครั้งแรกที่เข้าเกม */
  showHelpIfFirstTime: () => void;
  /** พื้นที่เล่นที่กำลังแสดงบนแผนที่ */
  area: PlayArea;
  /** เปลี่ยนพื้นที่ (เลือกเองจากตัวเลือกพื้นที่) */
  selectArea: (id: string) => void;
  /** ล็อกพื้นที่ไว้เพราะมีภารกิจค้างอยู่ */
  areaLocked: boolean;
};
const ShellContext = createContext<ShellContextValue>({
  recenter: () => undefined,
  area: DEFAULT_AREA,
  selectArea: () => undefined,
  areaLocked: false,
  helpOpen: false,
  openHelp: () => undefined,
  closeHelp: () => undefined,
  showHelpIfFirstTime: () => undefined,
});
export const useShell = () => useContext(ShellContext);

export function GameShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onMap = pathname === "/play";
  const geo = useGeo();
  const { me } = useGame();
  const [recenterSignal, setRecenterSignal] = useState(0);
  const recenter = useCallback(() => setRecenterSignal((n) => n + 1), []);
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    try {
      localStorage.setItem(HELP_SEEN_KEY, "1");
    } catch {}
  }, []);
  const showHelpIfFirstTime = useCallback(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(HELP_SEEN_KEY) === "1";
    } catch {}
    if (!seen) setHelpOpen(true);
  }, []);
  const mission = me?.activeMission ?? null;

  // ---------- พื้นที่เล่นที่เลือก ----------
  // จำตัวเลือกล่าสุดไว้ในเครื่อง · เดินเข้าพื้นที่ไหนจะเลือกพื้นที่นั้นให้อัตโนมัติ
  // ระหว่างมีภารกิจ ล็อกไว้ที่พื้นที่ของภารกิจ
  const [chosenId, setChosenId] = useState<string>(() => {
    try {
      return areaById(localStorage.getItem(AREA_KEY))?.id ?? DEFAULT_AREA.id;
    } catch {
      return DEFAULT_AREA.id;
    }
  });
  const selectArea = useCallback((id: string) => {
    if (!areaById(id)) return;
    setChosenId(id);
    try {
      localStorage.setItem(AREA_KEY, id);
    } catch {}
  }, []);

  const hereId = geo.fix ? (findAreaAt(geo.fix)?.id ?? null) : null;
  const lastHereId = useRef<string | null>(null);
  useEffect(() => {
    if (hereId === lastHereId.current) return;
    lastHereId.current = hereId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hereId) selectArea(hereId);
  }, [hereId, selectArea]);

  const missionArea = mission ? areaById(mission.areaId) : undefined;
  const area = missionArea ?? areaById(chosenId) ?? DEFAULT_AREA;
  const areaLocked = Boolean(mission);

  const shell = useMemo(
    () => ({ recenter, helpOpen, openHelp, closeHelp, showHelpIfFirstTime, area, selectArea, areaLocked }),
    [recenter, helpOpen, openHelp, closeHelp, showHelpIfFirstTime, area, selectArea, areaLocked],
  );

  const player = geo.fix ? { lat: geo.fix.lat, lng: geo.fix.lng, accuracy: geo.fix.accuracy } : null;
  const target = mission
    ? { ...mission.target, radiusM: mission.radiusM, name: mission.spotName }
    : null;

  return (
    <ShellContext.Provider value={shell}>
      {/* แผนที่อยู่ตลอด แค่ซ่อนเมื่อไม่ได้อยู่หน้าแผนที่ (ไม่ remount) */}
      <div
        className={`fixed inset-0 z-0 ${onMap ? "" : "invisible pointer-events-none"}`}
        aria-hidden={!onMap}
      >
        <GameMap
          area={area}
          player={player}
          target={target}
          recenterSignal={recenterSignal}
          onPick={geo.mock.enabled ? (p) => mockGps.set({ position: p, walkTarget: null }) : undefined}
        />
      </div>

      <div className={`relative z-10 min-h-dvh ${onMap ? "pointer-events-none" : "bg-[var(--background)]"}`}>
        <OfflineBanner />
        {children}
      </div>

      <BottomNav />
      <SafetyGate />
      <HelpModal />
      <ProfileSetup />
      <RewardModal />
    </ShellContext.Provider>
  );
}
