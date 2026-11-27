import type { PlayArea } from "@/config/game";
import { GAME_CONFIG } from "@/config/game";
import { SHOW_PLAYER_WITHIN_M, areaBounds, areaCenter } from "@/lib/areas";
import { haversineM, pointInPolygon, type Bounds } from "@/lib/geo";

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Map ID จำเป็นสำหรับ Advanced Markers — ใช้ DEMO_MAP_ID ได้ระหว่างทดลอง */
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/** กรอบที่เลื่อนแผนที่ได้ของพื้นที่หนึ่ง (กรอบพื้นที่ + ระยะเผื่อ) */
export function mapBoundsFor(area: PlayArea): Bounds {
  return areaBounds(area, GAME_CONFIG.map.boundsPaddingM);
}

export function mapCenterFor(area: PlayArea) {
  return areaCenter(area);
}

export type MapMarkers = {
  /** พื้นที่ที่กำลังแสดง — แผนที่แสดงและล็อกเฉพาะพื้นที่นี้ */
  area: PlayArea;
  player: { lat: number; lng: number; accuracy: number } | null;
  target: { lat: number; lng: number; radiusM: number; name: string } | null;
  /** แตะแผนที่ (ใช้กับ mock GPS และเครื่องมือแก้แผนที่) */
  onPick?: (p: { lat: number; lng: number }) => void;
  /** โหมดแก้แผนที่: ปลดล็อกแผนที่ แสดงทุกจุด และกรอบ/หมุดที่กำลังวาด */
  editing?: { draft: { lat: number; lng: number }[]; pendingSpot: { lat: number; lng: number } | null } | null;
};

/**
 * พื้นที่ขอบจอที่ถูกแถบด้านบน (ชื่อผู้เล่น/ตัวเลือกพื้นที่/คำเตือน) และการ์ดภารกิจ+แถบเมนูด้านล่างบัง (px)
 * ใช้ตอนซูมให้เห็นหลายจุดพร้อมกัน เพื่อไม่ให้จุดสำคัญไปอยู่ใต้แผงเหล่านี้
 */
export const MAP_OVERLAY_PADDING = { top: 220, bottom: 340, left: 28, right: 28 };

/** ผู้เล่นอยู่ตรงไหนเทียบกับพื้นที่ที่เลือก: ไม่มีตำแหน่ง / ในพื้นที่ / ใกล้ (≤ 2 กม.) / ไกล */
export type PlayerMode = "none" | "inside" | "nearby" | "far";

export function playerModeFor(area: PlayArea, player: { lat: number; lng: number } | null): PlayerMode {
  if (!player) return "none";
  if (pointInPolygon(player, area.polygon)) return "inside";
  return haversineM(player, areaCenter(area)) <= SHOW_PLAYER_WITHIN_M ? "nearby" : "far";
}
