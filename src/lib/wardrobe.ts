import { PET_SPECIES, findAccessory, findSpecies, type Accessory, type AccessorySlot } from "@/config/pets";

/** ชนิดสัตว์ที่ปลดล็อกแล้ว ตามเลเวลสูงสุดของสัตว์เลี้ยงที่มี */
export function unlockedSpeciesIds(bestLevel: number): string[] {
  return Object.values(PET_SPECIES)
    .filter((s) => s.unlockLevel <= bestLevel)
    .map((s) => s.id);
}

export type AdoptVerdict = "switch" | "adopt" | "locked" | "unknown";

/**
 * เลือกสัตว์เลี้ยงตัวที่จะออกเดินด้วย
 * - มีอยู่แล้ว → สลับ
 * - ยังไม่มีแต่ปลดล็อกแล้ว → รับเลี้ยงตัวใหม่ (เลเวล 1)
 */
export function adoptVerdict(speciesId: string, bestLevel: number, ownedSpeciesIds: string[]): AdoptVerdict {
  const species = findSpecies(speciesId);
  if (!species) return "unknown";
  if (ownedSpeciesIds.includes(speciesId)) return "switch";
  if (species.unlockLevel > bestLevel) return "locked";
  return "adopt";
}

export type BuyVerdict = "ok" | "unknown" | "owned" | "not_enough_coins";

export function buyVerdict(accessoryId: string, inventory: string[], coins: number): BuyVerdict {
  const item = findAccessory(accessoryId);
  if (!item) return "unknown";
  if (inventory.includes(accessoryId)) return "owned";
  if (coins < item.price) return "not_enough_coins";
  return "ok";
}

/** ใส่ของ 1 ชิ้น (แทนชิ้นเดิมในช่องเดียวกัน) */
export function equip(
  equipped: Partial<Record<AccessorySlot, string>> | undefined,
  item: Accessory,
): Partial<Record<AccessorySlot, string>> {
  return { ...(equipped ?? {}), [item.slot]: item.id };
}

/** ถอดของออกจากช่อง */
export function unequip(
  equipped: Partial<Record<AccessorySlot, string>> | undefined,
  slot: AccessorySlot,
): Partial<Record<AccessorySlot, string>> {
  const next = { ...(equipped ?? {}) };
  delete next[slot];
  return next;
}
