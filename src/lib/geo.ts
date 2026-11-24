import type { LatLng } from "@/config/game";

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** ระยะทางเส้นตรงบนผิวโลก (เมตร) ด้วยสูตร haversine */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** ทิศทางจาก a ไป b เป็นองศา 0–360 (0 = เหนือ, 90 = ตะวันออก) */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const THAI_DIRECTIONS = [
  "ทิศเหนือ",
  "ทิศตะวันออกเฉียงเหนือ",
  "ทิศตะวันออก",
  "ทิศตะวันออกเฉียงใต้",
  "ทิศใต้",
  "ทิศตะวันตกเฉียงใต้",
  "ทิศตะวันตก",
  "ทิศตะวันตกเฉียงเหนือ",
];

/** แปลงองศาเป็นชื่อทิศภาษาไทย 8 ทิศ */
export function bearingToThai(deg: number): string {
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return THAI_DIRECTIONS[idx];
}

/**
 * ตรวจว่าจุดอยู่ใน polygon หรือไม่ (ray casting)
 * ใช้ lng เป็นแกน x และ lat เป็นแกน y — แม่นพอสำหรับพื้นที่ขนาดโรงเรียน
 */
export function pointInPolygon(p: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects =
      yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export type Bounds = { north: number; south: number; east: number; west: number };

/** กรอบสี่เหลี่ยมรอบ polygon พร้อมระยะเผื่อ (เมตร) */
export function boundsOf(polygon: LatLng[], paddingM = 0): Bounds {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const p of polygon) {
    north = Math.max(north, p.lat);
    south = Math.min(south, p.lat);
    east = Math.max(east, p.lng);
    west = Math.min(west, p.lng);
  }
  const dLat = paddingM / 111_320;
  const midLat = (north + south) / 2;
  const dLng = paddingM / (111_320 * Math.cos(toRad(midLat)));
  return { north: north + dLat, south: south - dLat, east: east + dLng, west: west - dLng };
}

export function centerOf(polygon: LatLng[]): LatLng {
  const b = boundsOf(polygon);
  return { lat: (b.north + b.south) / 2, lng: (b.east + b.west) / 2 };
}

/** เลื่อนจุดจาก from ไปทาง to เป็นระยะ meters (ใช้ใน mock GPS) */
export function moveTowards(from: LatLng, to: LatLng, meters: number): LatLng {
  const d = haversineM(from, to);
  if (d <= meters || d === 0) return { ...to };
  const f = meters / d;
  return { lat: from.lat + (to.lat - from.lat) * f, lng: from.lng + (to.lng - from.lng) * f };
}

/** เลื่อนจุดตามทิศ (องศา) เป็นระยะ meters */
export function offsetM(from: LatLng, bearing: number, meters: number): LatLng {
  const dLat = (meters * Math.cos(toRad(bearing))) / 111_320;
  const dLng = (meters * Math.sin(toRad(bearing))) / (111_320 * Math.cos(toRad(from.lat)));
  return { lat: from.lat + dLat, lng: from.lng + dLng };
}

export function isValidLatLng(v: unknown): v is LatLng {
  if (!v || typeof v !== "object") return false;
  const { lat, lng } = v as Record<string, unknown>;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} ม.`;
  return `${(m / 1000).toFixed(m < 10_000 ? 2 : 1)} กม.`;
}
