import { describe, expect, it } from "vitest";
import { FOODS, PET_CONFIG } from "@/config/pets";
import { addXp, applyDecay, feedPet, newPet, petMood, rewardPetForMission } from "../pet";

const t0 = 1_800_000_000_000;
const HOUR = 3_600_000;

describe("pet", () => {
  it("decays over time", () => {
    const p = newPet("puifai", "ปุย", t0);
    const later = applyDecay(p, t0 + 2 * HOUR);
    expect(later.fullness).toBeCloseTo(p.fullness - 2 * PET_CONFIG.fullnessDecayPerHour, 5);
    expect(later.happiness).toBeCloseTo(p.happiness - 2 * PET_CONFIG.happinessDecayPerHour, 5);
    expect(later.updatedAt).toBe(t0 + 2 * HOUR);
  });

  it("never drops below the minimum (pets never die)", () => {
    const p = newPet("puifai", "ปุย", t0);
    const months = applyDecay(p, t0 + 90 * 24 * HOUR);
    expect(months.fullness).toBe(PET_CONFIG.minStat);
    expect(months.happiness).toBe(PET_CONFIG.minStat);
    expect(months.level).toBe(p.level);
    expect(petMood(months)).toBe("hungry");
  });

  it("recovers easily with a couple of meals", () => {
    let p = applyDecay(newPet("puifai", "ปุย", t0), t0 + 90 * 24 * HOUR);
    p = feedPet(p, FOODS[2]);
    p = feedPet(p, FOODS[2]);
    expect(petMood(p)).not.toBe("hungry");
  });

  it("does not decay if time goes backwards", () => {
    const p = newPet("puifai", "ปุย", t0);
    expect(applyDecay(p, t0 - HOUR)).toEqual(p);
  });

  it("feeding caps at max and adds xp", () => {
    const p = { ...newPet("puifai", "ปุย", t0), fullness: 95 };
    const fed = feedPet(p, FOODS[3]);
    expect(fed.fullness).toBe(PET_CONFIG.maxStat);
    expect(fed.xp).toBe(FOODS[3].xp);
  });

  it("levels up with carry-over xp", () => {
    const p = newPet("puifai", "ปุย", t0);
    const need = PET_CONFIG.xpForLevel(1);
    const up = addXp(p, need + 7);
    expect(up.level).toBe(2);
    expect(up.xp).toBe(7);
    const multi = addXp(p, PET_CONFIG.xpForLevel(1) + PET_CONFIG.xpForLevel(2));
    expect(multi.level).toBe(3);
  });

  it("mission reward makes the pet happier", () => {
    const p = { ...newPet("puifai", "ปุย", t0), happiness: 20 };
    expect(petMood(p)).toBe("tired");
    const r = rewardPetForMission(p);
    expect(r.happiness).toBe(20 + PET_CONFIG.missionHappinessBonus);
    expect(r.xp).toBe(PET_CONFIG.missionXp);
  });
});
