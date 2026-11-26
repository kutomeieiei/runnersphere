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
import { GAME_CONFIG } from "@/config/game";
import {
  MAP_ID,
  MAP_OVERLAY_PADDING,
  MAPS_API_KEY,
  mapBoundsFor,
  mapCenterFor,
  playerModeFor,
  type MapMarkers,
  type PlayerMode,
} from "./mapConfig";

/**
 * แผนที่ Google (Maps JavaScript API เท่านั้น — ไม่ใช้ Places/Directions/Geocoding)
 * component นี้ถูก mount ครั้งเดียวใน layout ของเกม และไม่ถูก remount เมื่อสลับหน้า
 *
 * แสดงและล็อกเฉพาะ "พื้นที่ที่เลือก" (ไม่เปิดแผนที่กว้าง)
 * ถ้าผู้เล่นอยู่นอกพื้นที่แต่ไม่ไกล (≤ 2 กม.) จะปลดล็อกและซูมให้เห็นทั้งผู้เล่นและพื้นที่
 * ถ้าไกลกว่านั้น แสดงเฉพาะพื้นที่ และกล่องเตือนด้านบนบอกระยะห่างแทน
 */
export function GoogleGameMap({
  area,
  player,
  target,
  onPick,
  recenterSignal,
  onLoadError,
}: MapMarkers & { recenterSignal: number; onLoadError?: () => void }) {
  const mode = playerModeFor(area, player);
  const unlocked = mode === "nearby";
  return (
    <APIProvider apiKey={MAPS_API_KEY} language="th" region="TH" onError={onLoadError}>
      <Map
        className="h-full w-full"
        mapId={MAP_ID}
        defaultCenter={mapCenterFor(area)}
        defaultZoom={GAME_CONFIG.map.defaultZoom}
        mapTypeId={GAME_CONFIG.map.mapType}
        minZoom={unlocked ? GAME_CONFIG.map.outsideMinZoom : GAME_CONFIG.map.minZoom}
        maxZoom={GAME_CONFIG.map.maxZoom}
        restriction={unlocked ? null : { latLngBounds: mapBoundsFor(area), strictBounds: false }}
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
          paths={area.polygon}
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
        <CameraFollow area={area} mode={mode} player={player} target={target} recenterSignal={recenterSignal} />
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
 * - เปลี่ยนพื้นที่ / ผู้เล่นเข้า-ออกพื้นที่ → จัดมุมกล้องใหม่ตามสถานการณ์
 *   (อยู่ในพื้นที่ = ไปหาผู้เล่น · อยู่ใกล้ = เห็นทั้งคู่ · อยู่ไกล = เห็นเฉพาะพื้นที่)
 * - กดปุ่ม 🎯 → กลับมาที่ผู้เล่น (ถ้าอยู่ไกลจะกลับมาที่พื้นที่แทน)
 * - ได้ภารกิจใหม่ → ซูมให้เห็นทั้งผู้เล่นและจุดหมาย
 */
function CameraFollow({
  area,
  mode,
  player,
  target,
  recenterSignal,
}: Pick<MapMarkers, "area" | "player" | "target"> & { mode: PlayerMode; recenterSignal: number }) {
  const map = useMap();
  const lastKey = useRef<string | null>(null);
  const lastTargetName = useRef<string | null>(null);

  const fitArea = (withPlayer: boolean) => {
    if (!map) return;
    const b = new google.maps.LatLngBounds();
    area.polygon.forEach((p) => b.extend(p));
    if (withPlayer && player) b.extend(player);
    map.fitBounds(b, MAP_OVERLAY_PADDING);
  };

  useEffect(() => {
    const key = `${area.id}:${mode}`;
    if (!map || lastKey.current === key) return;
    lastKey.current = key;
    if (mode === "inside" && player) {
      map.panTo(player);
      if ((map.getZoom() ?? 0) < GAME_CONFIG.map.defaultZoom) map.setZoom(GAME_CONFIG.map.defaultZoom);
    } else {
      fitArea(mode === "nearby");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, area.id, mode, player]);

  useEffect(() => {
    if (!map || recenterSignal === 0) return;
    if (player && mode !== "far") map.panTo(player);
    else fitArea(false);
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
