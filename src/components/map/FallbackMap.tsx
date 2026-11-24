"use client";

import { useMemo } from "react";
import { GEOFENCE, SPOTS } from "@/config/game";
import { MAP_BOUNDS, type MapMarkers } from "./mapConfig";

/**
 * แผนที่จำลอง (SVG) ใช้เมื่อยังไม่ได้ใส่ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * เพื่อให้พัฒนา/เดโมบนคอมพิวเตอร์ได้โดยไม่เสียค่าใช้จ่าย
 */
export function FallbackMap({ player, target, onPick, notice }: MapMarkers & { notice: string }) {
  const { north, south, east, west } = MAP_BOUNDS;
  const midLat = (north + south) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const W = 1000;
  const H = Math.round((W * (north - south)) / ((east - west) * kx));

  const project = useMemo(
    () => (p: { lat: number; lng: number }) => ({
      x: ((p.lng - west) / (east - west)) * W,
      y: ((north - p.lat) / (north - south)) * H,
    }),
    [north, south, east, west, H],
  );
  const metersToPx = W / ((east - west) * 111_320 * kx);

  const poly = GEOFENCE.polygon.map((p) => {
    const { x, y } = project(p);
    return `${x},${y}`;
  });

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onPick) return;
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    onPick({
      lat: north - (local.y / H) * (north - south),
      lng: west + (local.x / W) * (east - west),
    });
  }

  const pp = player ? project(player) : null;
  const tp = target ? project(target) : null;

  return (
    <div className="relative h-full w-full bg-[#2b1d18]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full w-full ${onPick ? "cursor-crosshair" : ""}`}
        onClick={onClick}
        role="img"
        aria-label="แผนที่จำลองของโรงเรียน"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#ffffff10" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        <polygon points={poly.join(" ")} fill="#ff6b3522" stroke="#ff7a3c" strokeWidth="4" />
        {SPOTS.map((s) => {
          const { x, y } = project(s.position);
          return (
            <g key={s.id} opacity={0.55}>
              <circle cx={x} cy={y} r={6} fill="#ffffff" />
              <text x={x + 10} y={y + 5} fontSize="20" fill="#ffffffcc">
                {s.name}
              </text>
            </g>
          );
        })}
        {tp && target && (
          <g>
            <circle cx={tp.x} cy={tp.y} r={target.radiusM * metersToPx} fill="#facc1555" stroke="#facc15" strokeWidth="3" />
            <text x={tp.x} y={tp.y - 14} fontSize="40" textAnchor="middle">
              🚩
            </text>
          </g>
        )}
        {pp && player && (
          <g>
            <circle cx={pp.x} cy={pp.y} r={Math.max(6, player.accuracy * metersToPx)} fill="#2e90fa33" stroke="#2e90fa88" />
            <circle cx={pp.x} cy={pp.y} r={11} fill="#2e90fa" stroke="#fff" strokeWidth="4" />
          </g>
        )}
      </svg>
      <div className="pointer-events-none absolute bottom-[19rem] left-3 max-w-[60%] rounded-full bg-black/60 px-3 py-1 text-[11px] text-white">
        {notice}
      </div>
    </div>
  );
}
