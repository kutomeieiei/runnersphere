"use client";

import { useState } from "react";
import { useGeo } from "@/components/providers/GeoProvider";
import { Modal } from "@/components/ui/Modal";
import { useAreas } from "@/components/providers/AreasProvider";
import { areasByDistance, findAreaAt } from "@/lib/areas";
import { formatDistance } from "@/lib/geo";
import { useShell } from "./GameShell";

/**
 * ปุ่มเลือกพื้นที่เล่น — แผนที่แสดงเฉพาะพื้นที่ที่เลือก
 * รายการเรียงจากใกล้ไปไกล และบอกว่า "คุณอยู่ที่นี่" (Nielsen #6 recognition, #1 status)
 * ระหว่างมีภารกิจ เปลี่ยนพื้นที่ไม่ได้ (ต้องยกเลิกภารกิจก่อน)
 */
export function AreaPicker() {
  const { area, selectArea, areaLocked } = useShell();
  const { fix } = useGeo();
  const { areas } = useAreas();
  const [open, setOpen] = useState(false);
  if (areas.length < 2) return null;

  const here = fix ? findAreaAt(fix, areas) : null;
  const list = fix ? areasByDistance(fix, areas) : areas.map((a) => ({ area: a, distanceM: null as number | null }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={areaLocked}
        aria-haspopup="dialog"
        className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-white/95 py-1.5 pl-3 pr-2 text-sm font-semibold text-brand-900 shadow ring-1 ring-black/5 backdrop-blur disabled:opacity-80"
      >
        <span aria-hidden>{area.icon}</span>
        <span className="truncate">{area.name}</span>
        {areaLocked ? (
          <span className="shrink-0 text-xs font-normal text-gray-500">· กำลังทำภารกิจ</span>
        ) : (
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">เปลี่ยน ▾</span>
        )}
      </button>

      <Modal open={open} title="เลือกพื้นที่เล่น" onClose={() => setOpen(false)}>
        <p className="mb-3 text-sm text-gray-600">แผนที่จะแสดงเฉพาะพื้นที่ที่เลือก ต้องเดินเข้าไปในพื้นที่ก่อนจึงจะเริ่มภารกิจได้</p>
        <ul className="space-y-2">
          {list.map(({ area: a, distanceM }) => {
            const selected = a.id === area.id;
            const isHere = here?.id === a.id;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    selectArea(a.id);
                    setOpen(false);
                  }}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${
                    selected ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm" aria-hidden>
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-gray-900">{a.name}</span>
                    <span className="block text-xs text-gray-500">
                      {a.spots.filter((s) => s.enabled !== false).length} จุดภารกิจ
                      {isHere ? " · 📍 คุณอยู่ที่นี่" : distanceM != null ? ` · ห่าง ${formatDistance(distanceM)}` : ""}
                    </span>
                  </span>
                  {selected && (
                    <span className="shrink-0 text-lg text-brand-600" aria-label="เลือกอยู่">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
