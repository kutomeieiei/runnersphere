import type { LatLng, PlayArea, SpotDifficulty } from "@/config/game";
import { ACTIVE_AREAS, mergeAreas, type AreaOverride, type CustomSpot } from "@/lib/areas";
import { db } from "./firebase-admin";

/*
 * ข้อมูลจากเครื่องมือ "แก้แผนที่" (ชั่วคราวช่วงทดสอบ)
 *   areaOverrides/{areaId}  { polygon, updatedBy, updatedAt }       กรอบพื้นที่ที่วาดใหม่
 *   customSpots/{spotId}    { areaId, name, position, difficulty, … } จุดภารกิจที่ปักเพิ่ม
 * client อ่าน/เขียนตรงไม่ได้ (Security Rules ปิด) ต้องผ่าน API
 */

const overridesCol = () => db().collection("areaOverrides");
const spotsCol = () => db().collection("customSpots");

type OverrideDoc = { polygon: LatLng[]; updatedBy: string; updatedAt: number };
type SpotDoc = {
  areaId: string;
  name: string;
  hint?: string;
  position: LatLng;
  difficulty: SpotDifficulty;
  createdBy: string;
  createdAt: number;
};

// cache สั้นๆ ต่อ instance ของ server — ลดการอ่าน Firestore ทุกครั้งที่เริ่มภารกิจ
let cache: { at: number; areas: PlayArea[] } | null = null;
const CACHE_MS = 15_000;

export function invalidateAreas() {
  cache = null;
}

/** พื้นที่ทั้งหมดที่ใช้จริง = config + กรอบที่วาดใหม่ + จุดที่ปักเพิ่ม */
export async function loadEffectiveAreas(): Promise<PlayArea[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.areas;
  const [ovSnap, spotSnap] = await Promise.all([overridesCol().get(), spotsCol().get()]);
  const overrides: AreaOverride[] = ovSnap.docs.map((d) => ({ areaId: d.id, polygon: (d.data() as OverrideDoc).polygon }));
  const custom: CustomSpot[] = spotSnap.docs.map((d) => {
    const s = d.data() as SpotDoc;
    return {
      id: d.id,
      areaId: s.areaId,
      name: s.name,
      hint: s.hint,
      position: s.position,
      difficulty: s.difficulty,
      custom: true,
    };
  });
  const areas = mergeAreas(ACTIVE_AREAS, overrides, custom);
  cache = { at: Date.now(), areas };
  return areas;
}

export async function hasOverride(areaId: string): Promise<boolean> {
  return (await overridesCol().doc(areaId).get()).exists;
}

export async function saveAreaPolygon(areaId: string, polygon: LatLng[], uid: string) {
  await overridesCol().doc(areaId).set({ polygon, updatedBy: uid, updatedAt: Date.now() } satisfies OverrideDoc);
  invalidateAreas();
}

export async function resetAreaPolygon(areaId: string) {
  await overridesCol().doc(areaId).delete();
  invalidateAreas();
}

export async function addCustomSpot(
  areaId: string,
  input: { name: string; position: LatLng; difficulty: SpotDifficulty; hint?: string },
  uid: string,
): Promise<string> {
  const ref = spotsCol().doc();
  const id = `custom-${ref.id.slice(0, 10).toLowerCase()}`;
  await spotsCol()
    .doc(id)
    .set({ areaId, ...input, createdBy: uid, createdAt: Date.now() } satisfies SpotDoc);
  invalidateAreas();
  return id;
}

export async function deleteCustomSpot(id: string): Promise<boolean> {
  if (!id.startsWith("custom-")) return false;
  const ref = spotsCol().doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  invalidateAreas();
  return true;
}

/** ใช้ใน debug/health: จำนวนรายการที่แก้ไว้ */
export async function editCounts() {
  const [ov, sp] = await Promise.all([overridesCol().count().get(), spotsCol().count().get()]);
  return { overriddenAreas: ov.data().count, customSpots: sp.data().count };
}
