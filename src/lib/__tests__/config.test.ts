import { describe, expect, it } from "vitest";
import { GAME_CONFIG, GEOFENCE, SPOTS } from "@/config/game";
import { FOODS, PET_SPECIES, DEFAULT_SPECIES_ID } from "@/config/pets";
import { pointInPolygon } from "../geo";

/** ตรวจความถูกต้องของไฟล์ config — รัน `npm test` ทุกครั้งที่แก้พิกัด */
describe("game config sanity", () => {
  it("geofence has at least 3 points", () => {
    expect(GEOFENCE.polygon.length).toBeGreaterThanOrEqual(3);
  });

  it("every spot is inside the geofence", () => {
    for (const s of SPOTS) {
      expect(pointInPolygon(s.position, GEOFENCE.polygon), `${s.id} อยู่นอก geofence`).toBe(true);
    }
  });

  it("spot ids are unique", () => {
    const ids = SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has enough enabled spots to avoid repeats", () => {
    expect(SPOTS.filter((s) => s.enabled !== false).length).toBeGreaterThanOrEqual(2);
  });

  it("arrival radius is sensible", () => {
    expect(GAME_CONFIG.arrival.radiusM).toBeGreaterThanOrEqual(15);
    expect(GAME_CONFIG.arrival.requiredConsecutive).toBeGreaterThanOrEqual(2);
  });

  it("pets and foods are configured", () => {
    expect(PET_SPECIES[DEFAULT_SPECIES_ID]).toBeDefined();
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
    for (const f of FOODS) expect(f.price).toBeGreaterThan(0);
  });
});
