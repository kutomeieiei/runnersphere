"use client";

import { useState } from "react";
import { useAreas } from "@/components/providers/AreasProvider";
import { useGeo } from "@/components/providers/GeoProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { LatLng, PlayArea } from "@/config/game";
import { api, ApiClientError } from "@/lib/api-client";
import { SPOT_NAME_MAX } from "@/lib/areas";
import { pointInPolygon } from "@/lib/geo";
import { useShell, type EditMode } from "./GameShell";

/**
 * เครื่องมือแก้แผนที่ (ชั่วคราวช่วงทดสอบ)
 * - วาดกรอบพื้นที่: แตะมุมรั้วทีละมุม หรือเดินไปที่มุมแล้วใช้ตำแหน่ง GPS
 * - ปักจุดภารกิจ: แตะตำแหน่ง ตั้งชื่อ บันทึก (ลบได้เฉพาะจุดที่ปักเอง)
 * - คัดลอกเป็นโค้ด config เพื่อเก็บถาวรเมื่อทดสอบเสร็จ
 * บันทึกแล้วมีผลทันที (server ใช้ข้อมูลนี้ตอนสุ่มภารกิจ)
 */
export function MapEditorPanel() {
  const { area, editMode, setEditMode, draft, setDraft, pendingSpot, setPendingSpot } = useShell();
  const { refreshAreas } = useAreas();
  const { fix } = useGeo();
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  const customSpots = area.spots.filter((s) => "custom" in s);
  const gpsPoint: LatLng | null = fix && fix.accuracy <= 40 ? { lat: fix.lat, lng: fix.lng } : null;

  async function run(body: Record<string, unknown>, ok: string, after?: () => void) {
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/areas/edit", { method: "POST", body });
      await refreshAreas();
      after?.();
      setMessage({ tone: "success", text: ok });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiClientError ? err.message : "บันทึกไม่สำเร็จ" });
    } finally {
      setBusy(false);
    }
  }

  const pendingInside = pendingSpot ? pointInPolygon(pendingSpot, area.polygon) : false;

  return (
    <div className="pointer-events-auto max-h-[42vh] overflow-y-auto rounded-3xl bg-white/95 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">โหมดทดสอบ</p>
          <p className="font-bold text-brand-900">
            ✏️ แก้แผนที่ · {area.icon} {area.shortName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditMode("off")}
          className="rounded-full px-3 py-1 text-sm font-semibold text-gray-600 ring-1 ring-gray-200"
        >
          เสร็จ
        </button>
      </div>

      <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1">
        {(
          [
            ["spot", "📍 ปักจุดภารกิจ"],
            ["polygon", "⬠ วาดกรอบพื้นที่"],
          ] as [EditMode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            role="tab"
            aria-selected={editMode === m}
            onClick={() => {
              setMessage(null);
              setEditMode(m);
            }}
            className={`rounded-xl py-1.5 text-sm font-semibold ${editMode === m ? "bg-white text-brand-900 shadow-sm" : "text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {editMode === "spot" && (
        <div className="mt-3 space-y-3">
          {!pendingSpot ? (
            <>
              <p className="text-sm text-gray-700">แตะบนแผนที่ตรงที่จะให้เด็กเดินไป (ต้องอยู่ในกรอบสีส้ม)</p>
              <Button variant="secondary" className="w-full" disabled={!gpsPoint} onClick={() => gpsPoint && setPendingSpot(gpsPoint)}>
                📡 ใช้ตำแหน่งที่ยืนอยู่ตอนนี้
              </Button>
              {!gpsPoint && <p className="text-xs text-gray-500">ปุ่มนี้ใช้ได้เมื่อ GPS แม่นไม่เกิน ±40 ม.</p>}
            </>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  { action: "addSpot", areaId: area.id, name, lat: pendingSpot.lat, lng: pendingSpot.lng, difficulty },
                  `ปักจุด "${name.trim()}" แล้ว`,
                  () => {
                    setPendingSpot(null);
                    setName("");
                  },
                );
              }}
            >
              {!pendingInside && <Alert tone="warning">จุดนี้อยู่นอกกรอบสีส้ม — วาดกรอบให้ครอบก่อน หรือแตะใหม่ในกรอบ</Alert>}
              <Field
                label="ชื่อจุด"
                name="spot-name"
                value={name}
                maxLength={SPOT_NAME_MAX}
                showCount
                onChange={(e) => setName(e.target.value)}
                hint="เช่น หน้าห้องสมุด, ใต้ต้นจามจุรี"
              />
              <label className="block text-sm font-medium text-gray-700">
                ความยาก (มีผลกับเหรียญโบนัส)
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5"
                >
                  <option value={1}>1 · ง่าย</option>
                  <option value={2}>2 · กลาง</option>
                  <option value={3}>3 · ยาก (+เหรียญมากขึ้น)</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" onClick={() => setPendingSpot(null)}>
                  ยกเลิก
                </Button>
                <Button type="submit" loading={busy} disabled={!name.trim() || !pendingInside}>
                  บันทึกจุด
                </Button>
              </div>
            </form>
          )}

          <div>
            <p className="mb-1 text-sm font-semibold text-gray-800">จุดที่ปักเอง ({customSpots.length})</p>
            {customSpots.length === 0 ? (
              <p className="text-xs text-gray-500">ยังไม่มี · จุดสีเทาบนแผนที่คือจุดจาก config (แก้ในโค้ด)</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-sm">
                {customSpots.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">🟠 {s.name}</span>
                    {confirmDelete === s.id ? (
                      <span className="flex shrink-0 gap-1">
                        <button className="rounded-lg px-2 py-1 text-xs ring-1 ring-gray-200" onClick={() => setConfirmDelete(null)}>
                          ไม่ลบ
                        </button>
                        <button
                          className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                          disabled={busy}
                          onClick={() => void run({ action: "deleteSpot", id: s.id }, `ลบ "${s.name}" แล้ว`, () => setConfirmDelete(null))}
                        >
                          ลบเลย
                        </button>
                      </span>
                    ) : (
                      <button className="shrink-0 text-xs font-semibold text-red-600 underline" onClick={() => setConfirmDelete(s.id)}>
                        ลบ
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {editMode === "polygon" && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-gray-700">
            แตะบนแผนที่ที่มุมรั้วทีละมุม <b>เรียงรอบรูป</b> (หรือเดินไปยืนที่มุมแล้วกดใช้ตำแหน่ง GPS) · วาดแล้ว{" "}
            <b>{draft.length}</b> มุม
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={!gpsPoint} onClick={() => gpsPoint && setDraft((d) => [...d, gpsPoint])}>
              📡 ใช้ตำแหน่ง GPS
            </Button>
            <Button variant="secondary" disabled={draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))}>
              ↩ ย้อนมุมล่าสุด
            </Button>
          </div>
          <Button
            className="w-full"
            loading={busy}
            disabled={draft.length < 3}
            onClick={() => void run({ action: "setPolygon", areaId: area.id, polygon: draft }, "บันทึกกรอบพื้นที่ใหม่แล้ว", () => setDraft([]))}
          >
            บันทึกกรอบ ({draft.length < 3 ? `ต้องอย่างน้อย 3 มุม` : `${draft.length} มุม`})
          </Button>
          <div className="flex justify-between text-xs">
            <button className="text-gray-600 underline disabled:opacity-40" disabled={draft.length === 0} onClick={() => setDraft([])}>
              ล้างที่วาด
            </button>
            <button
              className="text-gray-600 underline"
              disabled={busy}
              onClick={() => void run({ action: "resetPolygon", areaId: area.id }, "กลับไปใช้กรอบจาก config แล้ว")}
            >
              ใช้กรอบเดิมจาก config
            </button>
          </div>
        </div>
      )}

      {message && (
        <Alert tone={message.tone} className="mt-3">
          {message.text}
        </Alert>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3">
        <button className="text-sm font-semibold text-brand-700 underline" onClick={() => setShowCode((v) => !v)}>
          {showCode ? "ซ่อนโค้ด" : "คัดลอกเป็นโค้ด config (เก็บถาวร)"}
        </button>
        {showCode && <ConfigCode area={area} />}
      </div>
    </div>
  );
}

/** โค้ดของพื้นที่นี้ (กรอบ + จุดทั้งหมด) สำหรับวางใน src/config/game.ts */
function ConfigCode({ area }: { area: PlayArea }) {
  const [copied, setCopied] = useState(false);
  const r = (n: number) => Math.round(n * 1e6) / 1e6;
  const code = `    polygon: [
${area.polygon.map((p) => `      { lat: ${r(p.lat)}, lng: ${r(p.lng)} },`).join("\n")}
    ],
    spots: [
${area.spots
  .map(
    (s) =>
      `      { id: ${JSON.stringify(s.id)}, name: ${JSON.stringify(s.name)}, position: { lat: ${r(s.position.lat)}, lng: ${r(
        s.position.lng,
      )} }, difficulty: ${s.difficulty} },`,
  )
  .join("\n")}
    ],`;
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-gray-600">
        วางแทนส่วน <code>polygon</code> และ <code>spots</code> ของพื้นที่ <code>{area.id}</code> ใน <code>src/config/game.ts</code>
      </p>
      <textarea
        readOnly
        value={code}
        rows={8}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2 font-mono text-[11px]"
      />
      <Button
        variant="secondary"
        className="w-full"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "✅ คัดลอกแล้ว" : "📋 คัดลอก"}
      </Button>
    </div>
  );
}
