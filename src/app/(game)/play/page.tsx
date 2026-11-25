"use client";

import { CoinBadge } from "@/components/game/CoinBadge";
import { useShell } from "@/components/game/GameShell";
import { LocationStatus } from "@/components/game/LocationStatus";
import { MissionPanel } from "@/components/game/MissionPanel";
import { MockGpsPanel } from "@/components/game/MockGpsPanel";
import { useGame } from "@/components/providers/GameProvider";
import { useGeo } from "@/components/providers/GeoProvider";
import { Alert } from "@/components/ui/Alert";

/** หน้าแผนที่ — แผนที่จริงอยู่ใน layout (ไม่ remount) หน้านี้เป็นแค่ overlay */
export default function PlayPage() {
  const { me, loading, error, refresh } = useGame();
  const geo = useGeo();
  const { recenter } = useShell();

  return (
    <div className="flex min-h-dvh flex-col justify-between">
      <header className="safe-top space-y-2 px-3">
        <div className="pointer-events-auto flex items-center justify-between rounded-2xl bg-white/90 px-3 py-2 shadow ring-1 ring-black/5 backdrop-blur">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-900">
              {me ? `สวัสดี ${me.profile.nickname} 👋` : loading ? "กำลังโหลด…" : "Movemai"}
            </p>
            {geo.fix && (
              <p className="text-xs text-gray-500">
                GPS ±{Math.round(geo.fix.accuracy)} ม.{geo.fix.source === "mock" && " (จำลอง)"}
              </p>
            )}
          </div>
          {me && <CoinBadge coins={me.profile.coins} />}
        </div>
        <div className="pointer-events-auto">
          <LocationStatus />
        </div>
        {error && (
          <div className="pointer-events-auto">
            <Alert tone="error">
              {error.message}{" "}
              <button className="font-semibold underline" onClick={() => void refresh()}>
                ลองใหม่
              </button>
            </Alert>
          </div>
        )}
        <div className="flex justify-end">
          <MockGpsPanel />
        </div>
      </header>

      <div className="space-y-2 px-3 pb-24">
        <div className="flex justify-end">
          <button
            onClick={recenter}
            disabled={!geo.fix}
            aria-label="กลับมาที่ตำแหน่งของฉัน"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-lg ring-1 ring-black/5 disabled:opacity-50"
          >
            🎯
          </button>
        </div>
        <MissionPanel />
      </div>
    </div>
  );
}
