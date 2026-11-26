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

/**
 * พื้นที่ขอบจอที่ถูกแถบด้านบน (ชื่อผู้เล่น/คำเตือน) และการ์ดภารกิจ+แถบเมนูด้านล่างบัง (px)
 * ใช้ตอนซูมให้เห็นหลายจุดพร้อมกัน เพื่อไม่ให้จุดสำคัญไปอยู่ใต้แผงเหล่านี้
 */
export const MAP_OVERLAY_PADDING = { top: 190, bottom: 340, left: 28, right: 28 };
