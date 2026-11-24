import { describe, expect, it } from "vitest";
import { hasAccessoryArt } from "@/components/pet/Accessories";
import { ACCESSORIES, DEFAULT_SPECIES_ID, PET_SPECIES, findAccessory } from "@/config/pets";
import { adoptVerdict, buyVerdict, equip, unequip, unlockedSpeciesIds } from "../wardrobe";

describe("species unlocking", () => {
  it("only the starter is unlocked at level 1", () => {
    expect(unlockedSpeciesIds(1)).toEqual([DEFAULT_SPECIES_ID]);
  });

  it("unlocks more species as level grows", () => {
    expect(unlockedSpeciesIds(5)).toEqual(["puifai", "mali", "koko"]);
    expect(unlockedSpeciesIds(99)).toHaveLength(Object.keys(PET_SPECIES).length);
  });

  it("adoptVerdict covers switch / adopt / locked / unknown", () => {
    expect(adoptVerdict("puifai", 1, ["puifai"])).toBe("switch");
    expect(adoptVerdict("mali", 2, ["puifai"])).toBe("locked");
    expect(adoptVerdict("mali", 3, ["puifai"])).toBe("adopt");
    expect(adoptVerdict("mali", 3, ["puifai", "mali"])).toBe("switch");
    expect(adoptVerdict("dragon", 99, [])).toBe("unknown");
    expect(adoptVerdict("__proto__", 99, [])).toBe("unknown");
  });
});

describe("accessories", () => {
  const scarf = findAccessory("red-scarf")!;
  const bow = findAccessory("blue-bow")!;
  const cap = findAccessory("cap")!;

  it("buyVerdict checks ownership and coins", () => {
    expect(buyVerdict("red-scarf", [], 100)).toBe("ok");
    expect(buyVerdict("red-scarf", ["red-scarf"], 100)).toBe("owned");
    expect(buyVerdict("red-scarf", [], scarf.price - 1)).toBe("not_enough_coins");
    expect(buyVerdict("jetpack", [], 100)).toBe("unknown");
  });

  it("one item per slot: equipping replaces the item in the same slot only", () => {
    let e = equip(undefined, scarf);
    e = equip(e, cap);
    e = equip(e, bow);
    expect(e).toEqual({ neck: "blue-bow", head: "cap" });
  });

  it("unequip removes only that slot", () => {
    expect(unequip({ neck: "blue-bow", head: "cap" }, "neck")).toEqual({ head: "cap" });
    expect(unequip(undefined, "face")).toEqual({});
  });
});

describe("pet config sanity", () => {
  it("accessory ids are unique and every accessory has artwork", () => {
    expect(new Set(ACCESSORIES.map((a) => a.id)).size).toBe(ACCESSORIES.length);
    for (const a of ACCESSORIES) {
      expect(hasAccessoryArt(a.id), `${a.id} ไม่มีรูปวาดใน Accessories.tsx`).toBe(true);
      expect(a.price).toBeGreaterThan(0);
    }
  });

  it("the starter species is free at level 1 and ids match keys", () => {
    expect(PET_SPECIES[DEFAULT_SPECIES_ID].unlockLevel).toBe(1);
    for (const [key, s] of Object.entries(PET_SPECIES)) expect(s.id).toBe(key);
  });
});
