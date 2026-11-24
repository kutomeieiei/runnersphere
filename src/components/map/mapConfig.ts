import { GAME_CONFIG, GEOFENCE } from "@/config/game";
import { boundsOf, centerOf } from "@/lib/geo";

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Map ID จำเป็นสำหรับ Advanced Markers — ใช้ DEMO_MAP_ID ได้ระหว่างทดลอง */
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

export const MAP_CENTER = centerOf(GEOFENCE.polygon);
export const MAP_BOUNDS = boundsOf(GEOFENCE.polygon, GAME_CONFIG.map.boundsPaddingM);

export type MapMarkers = {
  player: { lat: number; lng: number; accuracy: number } | null;
  target: { lat: number; lng: number; radiusM: number; name: string } | null;
  /** คลิกแผนที่เพื่อย้ายตำแหน่ง mock GPS */
  onPick?: (p: { lat: number; lng: number }) => void;
};
