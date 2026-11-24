"use client";

import { useState } from "react";
import type { DailyStats } from "@/lib/api-types";
import { formatDistance } from "@/lib/geo";

const DAY_NAMES = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * กราฟแท่ง 1 ชุดข้อมูล (จำนวนจุดต่อวัน 7 วันล่าสุด)
 * single series → ไม่มี legend (หัวข้อบอกแล้ว), แตะ/ชี้เพื่อดูค่า, มีตารางข้อมูลให้อ่านแทนได้
 */
export function WeekChart({ days }: { days: DailyStats[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.spots));
  const shown = active ?? days.length - 1;
  const cur = days[shown];

  return (
    <div>
      <div className="mb-2 h-10 text-sm text-gray-700" aria-live="polite">
        {cur && (
          <>
            <span className="font-semibold text-gray-900">
              {dayLabel(cur.date)} {cur.date.slice(8)}/{cur.date.slice(5, 7)}
            </span>{" "}
            · {cur.spots} จุด · {formatDistance(cur.distanceM)} · {cur.coins} 🪙
          </>
        )}
      </div>
      <div className="relative h-36" onMouseLeave={() => setActive(null)}>
        {/* เส้นฐานและเส้นกริดจางๆ */}
        <div className="absolute inset-x-0 bottom-6 border-t border-gray-300" />
        <div className="absolute inset-x-0 bottom-[calc(1.5rem+50%)] border-t border-dashed border-gray-100" />
        <div className="absolute inset-0 bottom-6 flex items-end gap-2">
          {days.map((d, i) => {
            const h = (d.spots / max) * 100;
            const isActive = i === shown;
            return (
              <button
                key={d.date}
                type="button"
                className="group flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={`${d.date}: ${d.spots} จุด`}
              >
                <span
                  className={`block w-full max-w-8 rounded-t-[4px] transition-colors ${
                    isActive ? "bg-brand-600" : "bg-brand-300 group-hover:bg-brand-500"
                  }`}
                  style={{ height: d.spots ? `${Math.max(h, 4)}%` : "2px", opacity: d.spots ? 1 : 0.5 }}
                />
              </button>
            );
          })}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex gap-2">
          {days.map((d, i) => (
            <span key={d.date} className={`flex-1 text-center text-xs ${i === shown ? "font-semibold text-gray-900" : "text-gray-500"}`}>
              {dayLabel(d.date)}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-2 text-sm text-gray-600">
        <summary className="cursor-pointer">ดูเป็นตาราง</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="py-1 font-medium">วันที่</th>
              <th className="font-medium">จุด</th>
              <th className="font-medium">ระยะทาง</th>
              <th className="font-medium">เหรียญ</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {days.map((d) => (
              <tr key={d.date} className="border-t border-gray-100">
                <td className="py-1">{d.date}</td>
                <td>{d.spots}</td>
                <td>{formatDistance(d.distanceM)}</td>
                <td>{d.coins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
