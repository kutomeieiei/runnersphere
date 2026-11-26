"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/game/PageHeader";
import { useGame } from "@/components/providers/GameProvider";
import { Alert } from "@/components/ui/Alert";
import { api, ApiClientError } from "@/lib/api-client";
import type { LeaderboardResponse, LeaderboardRow } from "@/lib/api-types";
import { formatDistance } from "@/lib/geo";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function thaiDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function LeaderboardPage() {
  const { me: game } = useGame();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<LeaderboardResponse>("/api/leaderboard"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "โหลดกระดานอันดับไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  // โหลดใหม่เมื่อจำนวนจุดของเราเปลี่ยน (เช่น เพิ่งทำภารกิจสำเร็จ)
  const mySpots = game?.profile.totals.spots;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, mySpots]);

  const meInTop = data?.top.some((r) => r.isMe) ?? false;

  return (
    <main className="safe-top mx-auto max-w-md px-4 pb-28">
      <PageHeader
        title="กระดานอันดับ"
        subtitle={
          data
            ? `สัปดาห์นี้ ${thaiDate(data.weekStart)} – ${thaiDate(data.weekEnd)} · ${data.totalPlayers} คน`
            : "อันดับประจำสัปดาห์"
        }
        action={
          <button
            onClick={() => void load()}
            disabled={loading}
            aria-label="โหลดอันดับใหม่"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-brand-800 shadow-sm ring-1 ring-brand-100 disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""} aria-hidden>
              ↻
            </span>
          </button>
        }
      />

      {!data && loading && (
        <div className="flex flex-col items-center gap-3 p-10 text-gray-600">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" aria-hidden />
          กำลังโหลดอันดับ…
        </div>
      )}

      {data && <MyCard data={data} />}

      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}

      <section className="mt-4 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-brand-100">
        {data && data.top.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            <p className="text-4xl" aria-hidden>
              🏁
            </p>
            <p className="mt-2 font-semibold text-gray-900">สัปดาห์นี้ยังไม่มีใครทำภารกิจ</p>
            <p className="text-sm">ไปถึงจุดแรกก่อนใครแล้วขึ้นอันดับ 1 เลย!</p>
            <Link href="/play" className="mt-3 inline-block font-semibold text-brand-700 underline">
              ไปหน้าแผนที่
            </Link>
          </div>
        ) : (
          <ol aria-label="อันดับสัปดาห์นี้">
            {(data?.top ?? []).map((row, i) => (
              <Row key={`${row.rank}-${row.nickname}-${i}`} row={row} />
            ))}
          </ol>
        )}
      </section>

      {data && data.me.visible && !meInTop && data.me.rank != null && (
        <p className="mt-3 text-center text-sm text-gray-600">
          คุณอยู่อันดับ {data.me.rank} — อีกนิดเดียวก็ติด {data.top.length} อันดับแรกแล้ว!
        </p>
      )}

      <p className="mt-4 text-center text-xs text-gray-500">
        นับจากจำนวนจุดที่ไปถึงในสัปดาห์นี้ (สูงสุดวันละ 12 จุด) ถ้าเท่ากันดูระยะทาง · เริ่มนับใหม่ทุกวันจันทร์
        <br />
        แสดงแค่ชื่อเล่นและตัวเลข ไม่แสดงตำแหน่ง ·{" "}
        <Link href="/settings" className="underline">
          ซ่อนชื่อของฉัน
        </Link>
      </p>
    </main>
  );
}

function MyCard({ data }: { data: LeaderboardResponse }) {
  const { me } = data;
  return (
    <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-sm">
      <p className="text-sm text-brand-100">ของฉันสัปดาห์นี้</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums">
            {me.spots} <span className="text-base font-medium text-brand-100">จุด</span>
          </p>
          <p className="text-sm text-brand-100">เดินประมาณ {formatDistance(me.distanceM)}</p>
        </div>
        <div className="text-right">
          {!me.visible ? (
            <p className="text-sm text-brand-100">ซ่อนชื่ออยู่</p>
          ) : me.rank != null ? (
            <p className="text-3xl font-bold tabular-nums">
              <span className="text-base font-medium text-brand-100">อันดับ </span>
              {me.rank}
            </p>
          ) : (
            <p className="text-sm text-brand-100">ไปถึง 1 จุดเพื่อขึ้นกระดาน</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ row }: { row: LeaderboardRow }) {
  return (
    <li
      className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 ${
        row.isMe ? "bg-brand-50" : ""
      }`}
      aria-current={row.isMe ? "true" : undefined}
    >
      <span className="w-8 shrink-0 text-center text-lg font-bold tabular-nums text-gray-700">
        {MEDALS[row.rank] ?? row.rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-gray-900">
          {row.nickname}
          {row.isMe && <span className="ml-1 text-xs font-medium text-brand-700">(ฉัน)</span>}
        </span>
        <span className="text-xs text-gray-500">{formatDistance(row.distanceM)}</span>
      </span>
      <span className="shrink-0 text-right font-bold tabular-nums text-gray-900">
        {row.spots} <span className="text-xs font-medium text-gray-500">จุด</span>
      </span>
    </li>
  );
}
