"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { useGeo } from "@/components/providers/GeoProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { GAME_CONFIG } from "@/config/game";
import { findAreaAt } from "@/lib/areas";
import { useAreas } from "@/components/providers/AreasProvider";
import { useShell } from "./GameShell";
import { bearingDeg, bearingToThai, formatDistance, haversineM } from "@/lib/geo";
import { DirectionArrow } from "./DirectionArrow";

export function MissionPanel() {
  const game = useGame();
  const geo = useGeo();
  const { me, starting, actionError, lastCheck, lastCheckAt } = game;
  const { area, selectArea } = useShell();
  const { areas } = useAreas();
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
    const here = fix ? findAreaAt(fix, areas) : null;
    const inside = Boolean(here);
    // อยู่ในพื้นที่หนึ่ง แต่เลือกดูอีกพื้นที่ → ให้สลับกลับก่อน (ภารกิจเกิดในพื้นที่ที่ยืนอยู่จริงเสมอ)
    const viewingOtherArea = Boolean(here && here.id !== area.id);
    // บอกเหตุผลเสมอเมื่อกดเริ่มไม่ได้ (Nielsen #1, #5, #9) แทนปุ่มสีจางที่ไม่รู้ว่าทำไม
    let blockedReason: string | null = null;
    if (geo.status === "denied") blockedReason = "ต้องอนุญาตให้ใช้ตำแหน่งก่อน (ดูวิธีด้านบน)";
    else if (!fix || geo.status !== "watching") blockedReason = "กำลังรอสัญญาณ GPS… ออกไปที่โล่งจะเร็วขึ้น";
    else if (!inside) blockedReason = `ต้องอยู่ใน${area.shortName} (กรอบสีส้ม) ก่อน หรือเลือกพื้นที่อื่นด้านบน`;
    else if (viewingOtherArea && here) blockedReason = `ตอนนี้คุณอยู่ที่${here.shortName} ไม่ใช่${area.shortName}`;
    else if (geo.accuracyLevel === "approximate") blockedReason = "เปิด \"ตำแหน่งที่แม่นยำ\" ในเครื่องก่อน";
    const canStart = !blockedReason && !capReached;
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
          <>
            <Button
              className="mt-3 w-full text-lg"
              onClick={() => void game.startMission()}
              loading={starting}
              disabled={!canStart}
              aria-describedby={blockedReason ? "start-blocked-reason" : undefined}
            >
              🎯 สุ่มจุดภารกิจ
            </Button>
            {blockedReason && (
              <p id="start-blocked-reason" className="mt-2 text-center text-sm text-gray-600">
                {blockedReason}
                {viewingOtherArea && here && (
                  <button
                    type="button"
                    onClick={() => selectArea(here.id)}
                    className="ml-1 font-semibold text-brand-700 underline"
                  >
                    สลับไป{here.shortName}
                  </button>
                )}
              </p>
            )}
          </>
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
  // เวลาเดินโดยประมาณ (เดินปกติ ~1.2 ม./วินาที) — สื่อด้วยหน่วยที่เด็กเข้าใจง่าย (Nielsen #2)
  const walkMinutes = distance != null ? Math.max(1, Math.round(Math.max(0, distance - mission.radiusM) / 1.2 / 60)) : null;
  const secondsSinceCheck = lastCheckAt ? Math.max(0, Math.round((now - lastCheckAt) / 1000)) : null;

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
                {!inRadius && walkMinutes != null && <span className="text-gray-500"> · เดินราว {walkMinutes} นาที</span>}
              </>
            ) : (
              "รอตำแหน่ง…"
            )}
          </p>
          {mission.spotHint && <p className="truncate text-xs text-gray-500">คำใบ้: {mission.spotHint}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" aria-hidden>
            {Array.from({ length: mission.required }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-5 rounded-full ${i < mission.consecutive ? "bg-brand-500" : "bg-gray-200"}`}
              />
            ))}
          </div>
          <span>
            ยืนยันตำแหน่ง {mission.consecutive}/{mission.required}
          </span>
        </div>
        <span>เหลือ {minutesLeft} นาที</span>
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        {secondsSinceCheck == null
          ? "ระบบจะตรวจตำแหน่งให้อัตโนมัติเมื่อเข้าใกล้จุด"
          : `ตรวจตำแหน่งล่าสุด ${secondsSinceCheck < 5 ? "เมื่อครู่" : `${secondsSinceCheck} วินาทีที่แล้ว`}`}
      </p>

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
