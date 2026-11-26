import { PLAY_AREAS, type LatLng, type PlayArea, type Spot } from "@/config/game";
import { boundsOf, centerOf, haversineM, pointInPolygon, type Bounds } from "./geo";

/** พื้นที่ที่เปิดใช้อยู่ (เรียงตามลำดับใน config) */
export const ACTIVE_AREAS: PlayArea[] = PLAY_AREAS.filter((a) => a.enabled !== false);

/** พื้นที่เริ่มต้น (อันแรกใน config) */
export const DEFAULT_AREA: PlayArea = ACTIVE_AREAS[0] ?? PLAY_AREAS[0];

/** ระยะที่ยังซูมให้เห็นทั้งผู้เล่นและพื้นที่ได้ ถ้าไกลกว่านี้แสดงเฉพาะพื้นที่ (ไม่เปิดแผนที่กว้าง) */
export const SHOW_PLAYER_WITHIN_M = 2000;

export function areaById(id: string | null | undefined): PlayArea | undefined {
  return ACTIVE_AREAS.find((a) => a.id === id);
}

/** พื้นที่ที่ตำแหน่งนี้อยู่ข้างใน (ถ้าไม่อยู่ในพื้นที่ใดเลย = null) */
export function findAreaAt(p: LatLng): PlayArea | null {
  return ACTIVE_AREAS.find((a) => pointInPolygon(p, a.polygon)) ?? null;
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
export function areasByDistance(p: LatLng): { area: PlayArea; distanceM: number }[] {
  return ACTIVE_AREAS.map((area) => ({ area, distanceM: distanceToArea(p, area) })).sort(
    (a, b) => a.distanceM - b.distanceM,
  );
}

/** จุดภารกิจทุกจุดจากทุกพื้นที่ */
export function allSpots(): (Spot & { areaId: string })[] {
  return PLAY_AREAS.flatMap((a) => a.spots.map((s) => ({ ...s, areaId: a.id })));
}
