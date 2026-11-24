"use client";

import { useEffect, useState } from "react";
import { WeekChart } from "@/components/game/WeekChart";
import { useGame } from "@/components/providers/GameProvider";
import { Alert } from "@/components/ui/Alert";
import { GAME_CONFIG } from "@/config/game";
import { api, ApiClientError } from "@/lib/api-client";
import type { StatsResponse } from "@/lib/api-types";
import { formatDistance } from "@/lib/geo";

const STATUS_TEXT: Record<string, string> = {
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
  expired: "หมดเวลา",
  flagged: "ถูกยกเลิก (ความเร็วผิดปกติ)",
  active: "กำลังทำ",
};

export default function StatsPage() {
  const { me } = useGame();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<StatsResponse>("/api/stats")
      .then(setStats)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "โหลดสถิติไม่สำเร็จ"));
  }, [me?.profile.totals.spots]);

  if (!me) return <div className="p-6 text-center text-gray-500">กำลังโหลด…</div>;
  const totals = me.profile.totals;
  const week = me.week;
  const weekSpots = week.reduce((s, d) => s + d.spots, 0);
  const weekDistance = week.reduce((s, d) => s + d.distanceM, 0);
  const days28 = stats?.days ?? [];
  const activeDays28 = days28.filter((d) => d.spots > 0).length;

  return (
    <main className="safe-top mx-auto max-w-md px-4 pb-28">
      <h1 className="py-3 text-2xl font-bold text-brand-900">สถิติสุขภาพ</h1>

      <section className="grid grid-cols-3 gap-2">
        <Tile label="ระยะรวม" value={formatDistance(totals.distanceM)} />
        <Tile label="จุดที่ไปถึง" value={`${totals.spots}`} />
        <Tile label="เหรียญที่ได้" value={`${totals.coinsEarned}`} />
      </section>

      <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
        <h2 className="font-semibold text-brand-900">วันนี้</h2>
        <p className="mt-1 text-3xl font-bold text-gray-900">
          {me.today.spots}
          <span className="text-base font-medium text-gray-500"> / {GAME_CONFIG.health.dailySpotCap} จุด</span>
        </p>
        <p className="text-sm text-gray-600">เดินประมาณ {formatDistance(me.today.distanceM)} · ได้ {me.today.coins} 🪙</p>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-brand-900">จำนวนจุดต่อวัน (7 วันล่าสุด)</h2>
        </div>
        <p className="mb-3 text-sm text-gray-600">
          สัปดาห์นี้ {weekSpots} จุด · {formatDistance(weekDistance)}
        </p>
        <WeekChart days={week} />
      </section>

      {stats && (
        <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
          <h2 className="font-semibold text-brand-900">28 วันล่าสุด</h2>
          <p className="text-sm text-gray-600">ออกไปเดิน {activeDays28} วัน จาก 28 วัน</p>
          <h3 className="mt-3 text-sm font-semibold text-gray-700">ภารกิจล่าสุด</h3>
          {stats.recent.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">ยังไม่มีภารกิจ ไปเดินกันเลย!</p>
          ) : (
            <ul className="mt-1 divide-y divide-gray-100 text-sm">
              {stats.recent.map((m) => (
                <li key={m.id} className="flex justify-between py-2">
                  <span>
                    <span className="font-medium text-gray-900">{m.spotName}</span>
                    <span className="block text-xs text-gray-500">
                      {new Date(m.startedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                      {STATUS_TEXT[m.status] ?? m.status}
                    </span>
                  </span>
                  {m.coinsAwarded > 0 && <span className="font-semibold text-gray-900">+{m.coinsAwarded} 🪙</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}
      <p className="mt-4 text-center text-xs text-gray-500">
        ระยะทางเป็นค่าประมาณ (ระยะเส้นตรงจากจุดเริ่มถึงจุดหมาย) — เราไม่เก็บเส้นทางเดินของคุณ
      </p>
    </main>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-brand-100">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
