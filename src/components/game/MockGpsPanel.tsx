"use client";

import { useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { useGeo } from "@/components/providers/GeoProvider";
import { GEOFENCE, SPOTS } from "@/config/game";
import { centerOf, offsetM } from "@/lib/geo";
import { MOCK_GPS_AVAILABLE, mockGps, type MockMode } from "@/lib/mock-gps";

/**
 * แผงควบคุม Mock GPS (dev mode) — ทดสอบบนคอมพิวเตอร์ได้
 * - คลิกบนแผนที่เพื่อย้ายตำแหน่ง
 * - "เดินไปที่จุด" จำลองการเดินด้วยความเร็วที่เลือก
 * - ปรับ accuracy เพื่อจำลอง GPS แย่ / ตำแหน่งโดยประมาณ
 * - จำลองการปฏิเสธสิทธิ์ตำแหน่ง
 */
export function MockGpsPanel() {
  const { mock } = useGeo();
  const { me } = useGame();
  const [open, setOpen] = useState(false);
  if (!MOCK_GPS_AVAILABLE) return null;

  const target = me?.activeMission?.target ?? null;
  const center = centerOf(GEOFENCE.polygon);

  return (
    <div className="pointer-events-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full px-3 py-2 text-xs font-semibold shadow ${
          mock.enabled ? "bg-fuchsia-600 text-white" : "bg-white/90 text-gray-800"
        }`}
      >
        🧪 Mock GPS {mock.enabled ? "ON" : "OFF"}
      </button>
      {open && (
        <div className="mt-2 w-72 space-y-3 rounded-2xl bg-white/95 p-3 text-sm shadow-xl ring-1 ring-black/10">
          <label className="flex items-center justify-between">
            <span className="font-semibold">ใช้ตำแหน่งจำลอง</span>
            <input
              type="checkbox"
              checked={mock.enabled}
              onChange={(e) => mockGps.set({ enabled: e.target.checked, walkTarget: null })}
              className="h-5 w-5 accent-fuchsia-600"
            />
          </label>
          {mock.enabled && (
            <>
              <p className="text-xs text-gray-500">คลิกบนแผนที่เพื่อย้ายตำแหน่ง (วาร์ปจะถูก anti-cheat จับถ้ามีภารกิจอยู่)</p>
              <div className="grid grid-cols-2 gap-2">
                <MockBtn onClick={() => target && mockGps.set({ walkTarget: target })} disabled={!target}>
                  🚶 เดินไปที่จุด
                </MockBtn>
                <MockBtn onClick={() => mockGps.set({ walkTarget: null })}>✋ หยุด</MockBtn>
                <MockBtn onClick={() => target && mockGps.set({ position: target, walkTarget: null })} disabled={!target}>
                  ⚡ วาร์ปไปจุด
                </MockBtn>
                <MockBtn onClick={() => mockGps.set({ position: center, walkTarget: null })}>🏫 กลางโรงเรียน</MockBtn>
                <MockBtn onClick={() => mockGps.set({ position: offsetM(center, 0, 1500), walkTarget: null })}>
                  🚌 นอกโรงเรียน
                </MockBtn>
                <MockBtn
                  onClick={() => {
                    const s = SPOTS[Math.floor(Math.random() * SPOTS.length)];
                    mockGps.set({ position: s.position, walkTarget: null });
                  }}
                >
                  🎲 จุดสุ่ม
                </MockBtn>
              </div>
              <label className="block">
                <span className="flex justify-between">
                  <span>ความเร็วเดิน</span>
                  <b>{mock.speedMps} m/s</b>
                </span>
                <select
                  value={mock.speedMps}
                  onChange={(e) => mockGps.set({ speedMps: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border px-2 py-1"
                >
                  <option value={1.4}>1.4 m/s (เดินปกติ)</option>
                  <option value={3}>3 m/s (เดินเร็ว)</option>
                  <option value={6}>6 m/s (วิ่ง — ใกล้ขีดจำกัด)</option>
                  <option value={15}>15 m/s (เร็วเกิน → anti-cheat)</option>
                </select>
              </label>
              <label className="block">
                <span className="flex justify-between">
                  <span>accuracy</span>
                  <b>±{mock.accuracy} ม.</b>
                </span>
                <input
                  type="range"
                  min={3}
                  max={1500}
                  step={1}
                  value={mock.accuracy}
                  onChange={(e) => mockGps.set({ accuracy: Number(e.target.value) })}
                  className="w-full accent-fuchsia-600"
                />
                <span className="mt-1 flex gap-1">
                  {[8, 35, 60, 1200].map((a) => (
                    <button key={a} onClick={() => mockGps.set({ accuracy: a })} className="flex-1 rounded bg-gray-100 py-0.5 text-xs">
                      {a}
                    </button>
                  ))}
                </span>
              </label>
              <label className="flex items-center justify-between">
                <span>สุ่มคลาดเคลื่อน (jitter)</span>
                <input
                  type="checkbox"
                  checked={mock.jitter}
                  onChange={(e) => mockGps.set({ jitter: e.target.checked })}
                  className="h-4 w-4 accent-fuchsia-600"
                />
              </label>
              <label className="block">
                <span>จำลองสถานะ</span>
                <select
                  value={mock.mode}
                  onChange={(e) => mockGps.set({ mode: e.target.value as MockMode })}
                  className="mt-1 w-full rounded-lg border px-2 py-1"
                >
                  <option value="ok">ปกติ</option>
                  <option value="denied">ปฏิเสธสิทธิ์ตำแหน่ง</option>
                  <option value="unavailable">GPS ใช้ไม่ได้</option>
                </select>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MockBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium hover:bg-gray-200 disabled:opacity-40"
    />
  );
}
