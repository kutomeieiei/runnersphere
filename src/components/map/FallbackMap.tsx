"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GEOFENCE, SPOTS, type LatLng } from "@/config/game";
import { boundsOf, centerOf, pointInPolygon } from "@/lib/geo";
import { MAP_BOUNDS, MAP_OVERLAY_PADDING, type MapMarkers } from "./mapConfig";

const M_PER_DEG = 111_320;

/**
 * แผนที่จำลอง (SVG โทนขาว) ใช้เมื่อยังไม่ได้ใส่ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * หรือเมื่อ Google Maps โหลดไม่ได้ — เกมยังเล่นต่อได้
 *
 * วาดด้วยหน่วย "พิกเซลจริงของจอ" เพื่อให้จุดผู้เล่น/ป้ายมีขนาดคงที่
 * และจัดเนื้อหาให้อยู่ในช่องที่ไม่ถูกแถบด้านบน/การ์ดด้านล่างบัง
 * ถ้าผู้เล่นอยู่นอกโรงเรียน จะซูมออกให้เห็นทั้งผู้เล่นและโรงเรียน
 */
export function FallbackMap({ player, target, onPick, notice }: MapMarkers & { notice: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 844 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth || 390, h: el.clientHeight || 844 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const outside = Boolean(player && !pointInPolygon(player, GEOFENCE.polygon));
  // ปัดตำแหน่งเพื่อไม่ให้มุมกล้องกระตุกทุกครั้งที่ GPS ขยับเล็กน้อย
  const pLat = player ? Math.round(player.lat * 2000) / 2000 : 0;
  const pLng = player ? Math.round(player.lng * 2000) / 2000 : 0;

  const view = useMemo(() => {
    const b = outside ? boundsOf([...GEOFENCE.polygon, { lat: pLat, lng: pLng }], 80) : MAP_BOUNDS;
    const lat0 = b.north;
    const lng0 = b.west;
    const kx = Math.cos((((b.north + b.south) / 2) * Math.PI) / 180);
    const widthM = (b.east - b.west) * M_PER_DEG * kx;
    const heightM = (b.north - b.south) * M_PER_DEG;

    const pad = MAP_OVERLAY_PADDING;
    const availW = Math.max(120, size.w - pad.left - pad.right);
    const availH = Math.max(120, size.h - pad.top - pad.bottom);
    const scale = Math.min(availW / widthM, availH / heightM); // พิกเซลต่อเมตร
    const originX = pad.left + (availW - widthM * scale) / 2;
    const originY = pad.top + (availH - heightM * scale) / 2;

    const toPx = (p: LatLng) => ({
      x: originX + (p.lng - lng0) * M_PER_DEG * kx * scale,
      y: originY + (lat0 - p.lat) * M_PER_DEG * scale,
    });
    const toLatLng = (x: number, y: number): LatLng => ({
      lat: lat0 - (y - originY) / scale / M_PER_DEG,
      lng: lng0 + (x - originX) / scale / (M_PER_DEG * kx),
    });
    // เส้นตารางทุก 100 ม. (หรือ 1 กม. ถ้าซูมออกไกล)
    const gridM = 100 * scale >= 16 ? 100 : 1000;
    return { toPx, toLatLng, scale, grid: gridM * scale, originX, originY };
  }, [outside, pLat, pLng, size.w, size.h]);

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onPick(view.toLatLng(e.clientX - rect.left, e.clientY - rect.top));
  }

  const poly = GEOFENCE.polygon.map((p) => {
    const { x, y } = view.toPx(p);
    return `${x},${y}`;
  });
  const pp = player ? view.toPx(player) : null;
  const tp = target ? view.toPx(target) : null;
  const gridOffsetX = view.originX % view.grid;
  const gridOffsetY = view.originY % view.grid;

  return (
    <div ref={ref} className="relative h-full w-full bg-[#f3f4f1]">
      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        width={size.w}
        height={size.h}
        className={`absolute inset-0 ${onPick ? "cursor-crosshair" : ""}`}
        onClick={onClick}
        role="img"
        aria-label="แผนที่จำลองของโรงเรียน"
      >
        <defs>
          <pattern
            id="grid"
            x={gridOffsetX}
            y={gridOffsetY}
            width={view.grid}
            height={view.grid}
            patternUnits="userSpaceOnUse"
          >
            <path d={`M${view.grid} 0H0V${view.grid}`} fill="none" stroke="#e2e4df" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={size.w} height={size.h} fill="url(#grid)" />
        <polygon points={poly.join(" ")} fill="#ff6b3514" stroke="#ff6b35" strokeWidth="2.5" strokeLinejoin="round" />
        {!outside &&
          SPOTS.map((s) => {
            const { x, y } = view.toPx(s.position);
            return (
              <g key={s.id}>
                <circle cx={x} cy={y} r={3.5} fill="#9ca3af" />
                <text x={x + 6} y={y + 4} fontSize="11" fill="#4b5563">
                  {s.name}
                </text>
              </g>
            );
          })}
        {outside && pp && <SchoolLabelAndLine view={view} player={pp} />}
        {tp && target && (
          <g>
            <circle
              cx={tp.x}
              cy={tp.y}
              r={Math.max(6, target.radiusM * view.scale)}
              fill="#f43f5e2e"
              stroke="#e11d48"
              strokeWidth="2"
            />
            <text x={tp.x} y={tp.y - 6} fontSize="24" textAnchor="middle">
              🚩
            </text>
          </g>
        )}
        {pp && player && (
          <g>
            <circle
              cx={pp.x}
              cy={pp.y}
              r={Math.max(6, player.accuracy * view.scale)}
              fill="#0ea5e926"
              stroke="#0ea5e980"
            />
            <circle cx={pp.x} cy={pp.y} r={8} fill="#0ea5e9" stroke="#fff" strokeWidth="3" />
            <g transform={`translate(${pp.x}, ${pp.y - 22})`}>
              <rect x="-16" y="-11" width="32" height="18" rx="9" fill="#0284c7" />
              <text y="3" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">
                ฉัน
              </text>
            </g>
          </g>
        )}
      </svg>
      <div
        className="pointer-events-none absolute left-3 max-w-[60%] rounded-full bg-gray-900/70 px-3 py-1 text-[11px] text-white"
        style={{ bottom: 258 }}
      >
        {notice}
      </div>
    </div>
  );
}

/** เส้นประจากผู้เล่นไปโรงเรียน + ป้าย "โรงเรียน" ใต้กรอบ (แสดงเมื่ออยู่นอกโรงเรียน) */
function SchoolLabelAndLine({
  view,
  player,
}: {
  view: { toPx: (p: LatLng) => { x: number; y: number } };
  player: { x: number; y: number };
}) {
  const c = view.toPx(centerOf(GEOFENCE.polygon));
  const bottom = Math.max(...GEOFENCE.polygon.map((p) => view.toPx(p).y));
  return (
    <g>
      <line x1={player.x} y1={player.y} x2={c.x} y2={c.y} stroke="#0284c7" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />
      <g transform={`translate(${c.x}, ${bottom + 16})`}>
        <rect x="-30" y="-11" width="60" height="18" rx="9" fill="#ff6b35" />
        <text y="3" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">
          โรงเรียน
        </text>
      </g>
    </g>
  );
}
