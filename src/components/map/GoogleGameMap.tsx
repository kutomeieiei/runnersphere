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
import { MAP_BOUNDS, MAP_CENTER, MAP_ID, MAPS_API_KEY, type MapMarkers } from "./mapConfig";

/**
 * แผนที่ Google (Maps JavaScript API เท่านั้น — ไม่ใช้ Places/Directions/Geocoding)
 * component นี้ถูก mount ครั้งเดียวใน layout ของเกม และไม่ถูก remount เมื่อสลับหน้า
 */
export function GoogleGameMap({
  player,
  target,
  onPick,
  recenterSignal,
  onLoadError,
}: MapMarkers & { recenterSignal: number; onLoadError?: () => void }) {
  return (
    <APIProvider apiKey={MAPS_API_KEY} language="th" region="TH" onError={onLoadError}>
      <Map
        className="h-full w-full"
        mapId={MAP_ID}
        defaultCenter={MAP_CENTER}
        defaultZoom={GAME_CONFIG.map.defaultZoom}
        mapTypeId="hybrid"
        minZoom={GAME_CONFIG.map.minZoom}
        maxZoom={GAME_CONFIG.map.maxZoom}
        restriction={{ latLngBounds: MAP_BOUNDS, strictBounds: false }}
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
          fillOpacity={0.06}
          clickable={false}
        />
        {target && (
          <>
            <Circle
              center={target}
              radius={target.radiusM}
              strokeColor="#facc15"
              strokeWeight={2}
              fillColor="#facc15"
              fillOpacity={0.25}
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
              <div className="relative h-5 w-5">
                <span className="animate-pulse-ring absolute inset-0 rounded-full bg-sky-400" />
                <span className="absolute inset-0 rounded-full border-[3px] border-white bg-sky-500 shadow-lg" />
              </div>
            </AdvancedMarker>
          </>
        )}
        <CameraFollow player={player} target={target} recenterSignal={recenterSignal} />
      </Map>
    </APIProvider>
  );
}

/** เลื่อนกล้องไปหาผู้เล่นครั้งแรก และเมื่อกดปุ่ม "กลับมาที่ฉัน" */
function CameraFollow({
  player,
  target,
  recenterSignal,
}: Pick<MapMarkers, "player" | "target"> & { recenterSignal: number }) {
  const map = useMap();
  const centeredOnce = useRef(false);
  const lastTargetName = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !player || centeredOnce.current) return;
    centeredOnce.current = true;
    map.panTo(player);
  }, [map, player]);

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
    map.fitBounds(b, 80);
  }, [map, target, player]);

  return null;
}
