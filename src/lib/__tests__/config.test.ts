import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "@/config/game";
import { FOODS, PET_SPECIES, DEFAULT_SPECIES_ID } from "@/config/pets";

/** ตรวจความถูกต้องของไฟล์ config — รัน `npm test` ทุกครั้งที่แก้ค่า (พิกัดพื้นที่ตรวจใน areas.test.ts) */
describe("game config sanity", () => {
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
