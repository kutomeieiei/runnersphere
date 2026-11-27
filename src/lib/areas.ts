import { PLAY_AREAS, type LatLng, type PlayArea, type Spot, type SpotDifficulty } from "@/config/game";
import { boundsOf, centerOf, haversineM, isValidLatLng, pointInPolygon, type Bounds } from "./geo";

/** พื้นที่ที่เปิดใช้อยู่ตาม config (ยังไม่รวมการแก้จากเครื่องมือแก้แผนที่) */
export const ACTIVE_AREAS: PlayArea[] = PLAY_AREAS.filter((a) => a.enabled !== false);

/** พื้นที่เริ่มต้น (อันแรกใน config) */
export const DEFAULT_AREA: PlayArea = ACTIVE_AREAS[0] ?? PLAY_AREAS[0];

/** ระยะที่ยังซูมให้เห็นทั้งผู้เล่นและพื้นที่ได้ ถ้าไกลกว่านี้แสดงเฉพาะพื้นที่ (ไม่เปิดแผนที่กว้าง) */
export const SHOW_PLAYER_WITHIN_M = 2000;

export function areaById(id: string | null | undefined, areas: PlayArea[] = ACTIVE_AREAS): PlayArea | undefined {
  return areas.find((a) => a.id === id);
}

/** พื้นที่ที่ตำแหน่งนี้อยู่ข้างใน (ถ้าไม่อยู่ในพื้นที่ใดเลย = null) */
export function findAreaAt(p: LatLng, areas: PlayArea[] = ACTIVE_AREAS): PlayArea | null {
  return areas.find((a) => pointInPolygon(p, a.polygon)) ?? null;
}

export function areaCenter(area: PlayArea): LatLng {
  return centerOf(area.polygon);
}

export function areaBounds(area: PlayArea, paddingM = 0): Bounds {
  return boundsOf(area.polygon, paddingM);
}

/** ระยะจากตำแหน่งถึงกลางพื้นที่ (เมตร) — 0 ถ้าอยู่ในพื้นที่แล้ว */
export function distanceToArea(p: LatLng, area: PlayArea): number {
  return pointInPolygon(p, area.polygon) ? 0 : haversineM(p, areaCenter(area));
}

/** พื้นที่ทั้งหมดเรียงจากใกล้ไปไกล */
export function areasByDistance(p: LatLng, areas: PlayArea[] = ACTIVE_AREAS): { area: PlayArea; distanceM: number }[] {
  return areas
    .map((area) => ({ area, distanceM: distanceToArea(p, area) }))
    .sort((a, b) => a.distanceM - b.distanceM);
}

/** จุดภารกิจทุกจุดจากทุกพื้นที่ */
export function allSpots(areas: PlayArea[] = PLAY_AREAS): (Spot & { areaId: string })[] {
  return areas.flatMap((a) => a.spots.map((s) => ({ ...s, areaId: a.id })));
}

/* ------------------------------------------------------------------------- */
/* การแก้แผนที่ระหว่างทดสอบ (เครื่องมือ "แก้แผนที่" เก็บใน Firestore)              */
/* ------------------------------------------------------------------------- */

/** กรอบพื้นที่ที่วาดใหม่ (แทนกรอบใน config) */
export type AreaOverride = { areaId: string; polygon: LatLng[] };

/** จุดภารกิจที่ปักเพิ่มจากในแอป */
export type CustomSpot = Spot & { areaId: string; custom: true };

/**
 * รวมพื้นที่จาก config กับการแก้ในแอป:
 * - กรอบที่วาดใหม่ แทนกรอบเดิมของพื้นที่นั้น
 * - จุดที่ปักเพิ่ม ต่อท้ายจุดเดิมของพื้นที่นั้น
 */
export function mergeAreas(base: PlayArea[], overrides: AreaOverride[], custom: CustomSpot[]): PlayArea[] {
  return base.map((area) => {
    const ov = overrides.find((o) => o.areaId === area.id);
    const extra = custom.filter((s) => s.areaId === area.id);
    if (!ov && extra.length === 0) return area;
    return {
      ...area,
      polygon: ov && ov.polygon.length >= 3 ? ov.polygon : area.polygon,
      spots: [...area.spots, ...extra],
    };
  });
}

export const MAX_POLYGON_POINTS = 30;
export const SPOT_NAME_MAX = 40;

/** ตรวจกรอบพื้นที่ที่วาดมา: 3–30 จุด พิกัดถูกต้อง */
export function validatePolygon(raw: unknown): LatLng[] | null {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > MAX_POLYGON_POINTS) return null;
  if (!raw.every(isValidLatLng)) return null;
  return raw.map((p: LatLng) => ({ lat: p.lat, lng: p.lng }));
}

/** ตรวจข้อมูลจุดภารกิจที่จะปักใหม่ */
export function validateSpotInput(
  raw: unknown,
): { name: string; position: LatLng; difficulty: SpotDifficulty; hint?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.replace(/\s+/g, " ").trim() : "";
  if (!name || [...name].length > SPOT_NAME_MAX) return null;
  const position = { lat: r.lat, lng: r.lng };
  if (!isValidLatLng(position)) return null;
  const difficulty = r.difficulty === 2 || r.difficulty === 3 ? r.difficulty : 1;
  const hint = typeof r.hint === "string" && r.hint.trim() ? r.hint.trim().slice(0, 60) : undefined;
  return { name, position: position as LatLng, difficulty, hint };
}
