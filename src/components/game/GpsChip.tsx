"use client";

import { useGeo } from "@/components/providers/GeoProvider";

/**
 * ป้ายคุณภาพสัญญาณ GPS แบบอ่านง่าย (Nielsen #1 Visibility of system status, #2 Match the real world)
 * แทนตัวเลข "±8 ม." เปล่าๆ ที่เด็กอาจไม่เข้าใจ
 */
export function GpsChip() {
  const { status, fix, accuracyLevel } = useGeo();

  let tone = "bg-gray-100 text-gray-600";
  let text = "กำลังหาสัญญาณ GPS…";
  if (status === "denied") {
    tone = "bg-red-100 text-red-800";
    text = "ไม่ได้อนุญาตตำแหน่ง";
  } else if (fix) {
    const m = Math.round(fix.accuracy);
    if (accuracyLevel === "good" && m <= 20) {
      tone = "bg-emerald-100 text-emerald-800";
      text = `GPS ดีมาก ±${m} ม.`;
    } else if (accuracyLevel === "good") {
      tone = "bg-emerald-50 text-emerald-700";
      text = `GPS ดี ±${m} ม.`;
    } else if (accuracyLevel === "poor") {
      tone = "bg-amber-100 text-amber-800";
      text = `GPS อ่อน ±${m} ม.`;
    } else {
      tone = "bg-red-100 text-red-800";
      text = "ตำแหน่งโดยประมาณ";
    }
    if (fix.source === "mock") text += " · จำลอง";
  }

  return (
    <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      <span aria-hidden>📡</span>
      {text}
    </span>
  );
}
