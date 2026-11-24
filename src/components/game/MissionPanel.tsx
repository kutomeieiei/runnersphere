"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { useGeo } from "@/components/providers/GeoProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { GAME_CONFIG, GEOFENCE } from "@/config/game";
import { bearingDeg, bearingToThai, formatDistance, haversineM, pointInPolygon } from "@/lib/geo";
import { DirectionArrow } from "./DirectionArrow";

export function MissionPanel() {
  const game = useGame();
  const geo = useGeo();
  const { me, starting, actionError, lastCheck } = game;
  const mission = me?.activeMission ?? null;
  const fix = geo.fix;
  const [now, setNow] = useState(() => Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!me) return null;

  const today = me.today;
  const capReached = today.spots >= GAME_CONFIG.health.dailySpotCap;

  if (!mission) {
    const inside = fix ? pointInPolygon(fix, GEOFENCE.polygon) : false;
    const canStart =
      Boolean(fix) && inside && geo.accuracyLevel !== "approximate" && !capReached && geo.status === "watching";
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">วันนี้</p>
            <p className="text-lg font-semibold text-brand-900">
              {today.spots}/{GAME_CONFIG.health.dailySpotCap} จุด · {formatDistance(today.distanceM)}
            </p>
          </div>
          <div className="text-4xl" aria-hidden>
            🧭
          </div>
        </div>
        {capReached ? (
          <Alert tone="success" className="mt-3">
            วันนี้ครบ {GAME_CONFIG.health.dailySpotCap} จุดแล้ว เก่งมาก! พักผ่อน ดื่มน้ำ แล้วเจอกันพรุ่งนี้ 💧
          </Alert>
        ) : (
          <Button className="mt-3 w-full text-lg" onClick={() => void game.startMission()} loading={starting} disabled={!canStart}>
            🎯 สุ่มจุดภารกิจ
          </Button>
        )}
        {actionError && (
          <Alert tone="error" className="mt-3">
            {actionError.message}
          </Alert>
        )}
      </Card>
    );
  }

  const distance = fix ? haversineM(fix, mission.target) : null;
  const bearing = fix ? bearingDeg(fix, mission.target) : 0;
  const minutesLeft = Math.max(0, Math.ceil((mission.expiresAt - now) / 60_000));
  const inRadius = distance != null && distance <= mission.radiusM;

  let hint: { tone: "info" | "warning" | "success"; text: string } | null = null;
  switch (lastCheck?.outcome) {
    case "counting":
      hint = {
        tone: "success",
        text: `อยู่ในจุดแล้ว! ยืนนิ่งๆ สักครู่ กำลังยืนยันตำแหน่ง (${lastCheck.consecutive}/${lastCheck.required})`,
      };
      break;
    case "poor_accuracy":
      hint = { tone: "warning", text: "GPS ยังไม่แม่นพอ ลองไปยืนที่โล่ง ห่างจากอาคารหรือหลังคา" };
      break;
    case "too_fast":
      hint = { tone: "warning", text: "ตรวจพบการเคลื่อนที่เร็วผิดปกติ — เดินช้าๆ นะ ไม่ต้องวิ่ง" };
      break;
    case "invalid_timestamp":
      hint = { tone: "warning", text: "เวลาของเครื่องไม่ตรง ตั้งเวลาเป็นอัตโนมัติแล้วลองใหม่" };
      break;
  }
  if (!hint && inRadius) hint = { tone: "info", text: "ใกล้ถึงแล้ว! รอระบบยืนยันสักครู่" };

  return (
    <Card>
      <div className="flex items-center gap-3">
        <DirectionArrow bearing={bearing} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">ภารกิจ · ได้ {mission.coinsReward} 🪙</p>
          <p className="truncate text-lg font-bold text-brand-900">🚩 {mission.spotName}</p>
          <p className="text-sm text-gray-700">
            {distance != null ? (
              <>
                อีก <b>{formatDistance(distance)}</b> ไป{bearingToThai(bearing)}
              </>
            ) : (
              "รอตำแหน่ง…"
            )}
          </p>
          {mission.spotHint && <p className="truncate text-xs text-gray-500">คำใบ้: {mission.spotHint}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1" aria-label={`ยืนยันแล้ว ${mission.consecutive} จาก ${mission.required}`}>
          {Array.from({ length: mission.required }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-6 rounded-full ${i < mission.consecutive ? "bg-brand-500" : "bg-gray-200"}`}
            />
          ))}
        </div>
        <span>เหลือเวลา {minutesLeft} นาที</span>
      </div>

      {hint && (
        <Alert tone={hint.tone} className="mt-3">
          {hint.text}
        </Alert>
      )}

      {confirmCancel ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            ทำต่อ
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmCancel(false);
              void game.cancelMission();
            }}
          >
            ยกเลิกภารกิจ
          </Button>
        </div>
      ) : (
        <Button variant="ghost" className="mt-2 w-full text-sm" onClick={() => setConfirmCancel(true)}>
          เปลี่ยนจุด / ยกเลิก
        </Button>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto rounded-3xl bg-white/95 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur">
      {children}
    </div>
  );
}
