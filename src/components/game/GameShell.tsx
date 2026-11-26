"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { GameMap } from "@/components/map/GameMap";
import { useGame } from "@/components/providers/GameProvider";
import { useGeo } from "@/components/providers/GeoProvider";
import { mockGps } from "@/lib/mock-gps";
import { HELP_SEEN_KEY } from "@/lib/storage-keys";
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
};
const ShellContext = createContext<ShellContextValue>({
  recenter: () => undefined,
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
  const shell = useMemo(
    () => ({ recenter, helpOpen, openHelp, closeHelp, showHelpIfFirstTime }),
    [recenter, helpOpen, openHelp, closeHelp, showHelpIfFirstTime],
  );

  const mission = me?.activeMission ?? null;
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
