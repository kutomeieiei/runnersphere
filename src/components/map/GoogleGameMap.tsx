"use client";

import {
  AdvancedMarker,
  APIProvider,
  Circle,
  Map,
  Polygon,
  useMap,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import { GAME_CONFIG, GEOFENCE } from "@/config/game";
import { pointInPolygon } from "@/lib/geo";
import {
  MAP_BOUNDS,
  MAP_CENTER,
  MAP_ID,
  MAP_OVERLAY_PADDING,
  MAPS_API_KEY,
  type MapMarkers,
} from "./mapConfig";

/**
 * แผนที่ Google (Maps JavaScript API เท่านั้น — ไม่ใช้ Places/Directions/Geocoding)
 * component นี้ถูก mount ครั้งเดียวใน layout ของเกม และไม่ถูก remount เมื่อสลับหน้า
 *
 * ปกติล็อกให้เลื่อนได้เฉพาะรอบโรงเรียน แต่ถ้าผู้เล่นอยู่นอกโรงเรียน จะปลดล็อกและซูมให้เห็น
 * ทั้งตัวผู้เล่นและโรงเรียน (ไม่งั้นจุดของผู้เล่นจะอยู่นอกกรอบจนมองไม่เห็น)
 */
export function GoogleGameMap({
  player,
  target,
  onPick,
  recenterSignal,
  onLoadError,
}: MapMarkers & { recenterSignal: number; onLoadError?: () => void }) {
  const outside = Boolean(player && !pointInPolygon(player, GEOFENCE.polygon));
  return (
    <APIProvider apiKey={MAPS_API_KEY} language="th" region="TH" onError={onLoadError}>
      <Map
        className="h-full w-full"
        mapId={MAP_ID}
        defaultCenter={MAP_CENTER}
        defaultZoom={GAME_CONFIG.map.defaultZoom}
        mapTypeId={GAME_CONFIG.map.mapType}
        minZoom={outside ? GAME_CONFIG.map.outsideMinZoom : GAME_CONFIG.map.minZoom}
        maxZoom={GAME_CONFIG.map.maxZoom}
        restriction={outside ? null : { latLngBounds: MAP_BOUNDS, strictBounds: false }}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        onClick={(e: MapMouseEvent) => {
          const ll = e.detail.latLng;
          if (onPick && ll) onPick(ll);
        }}
      >
        <Polygon
          paths={GEOFENCE.polygon}
          strokeColor="#ff6b35"
          strokeOpacity={0.9}
          strokeWeight={3}
          fillColor="#ff6b35"
          fillOpacity={0.08}
          clickable={false}
        />
        {target && (
          <>
            <Circle
              center={target}
              radius={target.radiusM}
              strokeColor="#e11d48"
              strokeWeight={2}
              fillColor="#f43f5e"
              fillOpacity={0.18}
              clickable={false}
            />
            <AdvancedMarker position={target} title={target.name}>
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-900 shadow">
                  {target.name}
                </div>
                <div className="text-3xl drop-shadow">🚩</div>
              </div>
            </AdvancedMarker>
          </>
        )}
        {player && (
          <>
            <Circle
              center={player}
              radius={player.accuracy}
              strokeColor="#2e90fa"
              strokeOpacity={0.5}
              strokeWeight={1}
              fillColor="#2e90fa"
              fillOpacity={0.15}
              clickable={false}
            />
            <AdvancedMarker position={player} title="ตำแหน่งของคุณ" zIndex={10}>
              <PlayerDot />
            </AdvancedMarker>
          </>
        )}
        <CameraFollow player={player} target={target} recenterSignal={recenterSignal} outside={outside} />
      </Map>
    </APIProvider>
  );
}

/** จุดตำแหน่งผู้เล่น: วงกลมสีฟ้าขอบขาว + ป้าย "ฉัน" */
function PlayerDot() {
  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">ฉัน</span>
      <div className="relative h-6 w-6">
        <span className="animate-pulse-ring absolute inset-0 rounded-full bg-sky-400" />
        <span className="absolute inset-0 rounded-full border-[3px] border-white bg-sky-500 shadow-lg" />
      </div>
    </div>
  );
}

/**
 * ควบคุมกล้อง:
 * - ได้ตำแหน่งครั้งแรก / เดินเข้าโรงเรียน → เลื่อนไปหาผู้เล่น
 * - อยู่นอกโรงเรียน → ซูมให้เห็นทั้งผู้เล่นและโรงเรียน
 * - กดปุ่ม 🎯 → กลับมาที่ผู้เล่น
 * - ได้ภารกิจใหม่ → ซูมให้เห็นทั้งผู้เล่นและจุดหมาย
 */
function CameraFollow({
  player,
  target,
  recenterSignal,
  outside,
}: Pick<MapMarkers, "player" | "target"> & { recenterSignal: number; outside: boolean }) {
  const map = useMap();
  const lastOutside = useRef<boolean | null>(null);
  const lastTargetName = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !player || lastOutside.current === outside) return;
    lastOutside.current = outside;
    if (outside) {
      const b = new google.maps.LatLngBounds();
      GEOFENCE.polygon.forEach((p) => b.extend(p));
      b.extend(player);
      map.fitBounds(b, MAP_OVERLAY_PADDING);
    } else {
      map.panTo(player);
      if ((map.getZoom() ?? 0) < GAME_CONFIG.map.defaultZoom) map.setZoom(GAME_CONFIG.map.defaultZoom);
    }
  }, [map, player, outside]);

  useEffect(() => {
    if (!map) return;
    if (recenterSignal > 0 && player) map.panTo(player);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, recenterSignal]);

  // เมื่อได้ภารกิจใหม่ ซูมให้เห็นทั้งผู้เล่นและจุดหมาย
  useEffect(() => {
    if (!map || !target || !player || lastTargetName.current === target.name) return;
    lastTargetName.current = target.name;
    const b = new google.maps.LatLngBounds();
    b.extend(player);
    b.extend(target);
    map.fitBounds(b, MAP_OVERLAY_PADDING);
  }, [map, target, player]);

  return null;
}
