/**
 * ตั้งค่าสัตว์เลี้ยงและอาหาร
 *
 * เพิ่มชนิดสัตว์เลี้ยงใหม่: เพิ่ม entry ใน PET_SPECIES (id ห้ามซ้ำ)
 * แล้วเพิ่มรูปวาดใน src/components/pet/PetAvatar.tsx (ถ้าไม่มีจะใช้รูป default)
 */

export type PetSpecies = {
  id: string;
  name: string;
  description: string;
  /** สีหลัก/สีท้อง ใช้วาดตัวละคร */
  colors: { body: string; belly: string; accent: string };
};

export const PET_SPECIES: Record<string, PetSpecies> = {
  puifai: {
    id: "puifai",
    name: "ปุยฝ้าย",
    description: "ก้อนขนฟูนุ่มที่ชอบออกไปเดินเล่นด้วยกัน",
    colors: { body: "#ffd6a5", belly: "#fff3e0", accent: "#ff8fab" },
  },
};

export const DEFAULT_SPECIES_ID = "puifai";

export const PET_CONFIG = {
  /** ค่าสถานะอยู่ในช่วง 0–100 */
  maxStat: 100,
  /**
   * ค่าต่ำสุดที่ลดลงได้ — ไม่มีวันเป็น 0 สัตว์เลี้ยงไม่ตายและไม่หายไป
   * ถ้าไม่ได้เล่นนานๆ จะแค่ "หิว" หรือ "เหนื่อย/เหงา" และกลับมาปกติได้ด้วยอาหาร 1–2 มื้อ
   */
  minStat: 10,
  /** ความอิ่มลดลงกี่หน่วยต่อชั่วโมง */
  fullnessDecayPerHour: 3,
  /** ความสุขลดลงกี่หน่วยต่อชั่วโมง */
  happinessDecayPerHour: 2,
  /** ต่ำกว่าค่านี้ถือว่า หิว / เหนื่อย */
  lowThreshold: 30,
  start: { fullness: 80, happiness: 80 },
  /** เมื่อทำภารกิจสำเร็จ สัตว์เลี้ยงมีความสุขเพิ่ม (ได้ออกไปเดินด้วยกัน) */
  missionHappinessBonus: 10,
  missionXp: 15,
  /** XP ที่ต้องใช้เพื่อขึ้นจากเลเวล n ไป n+1 */
  xpForLevel: (level: number) => 40 + level * 20,
  /** เลเวลไม่ลดลงตามเวลา (ไม่กดดันผู้เล่น) */
  maxLevel: 50,
} as const;

export type Food = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  fullness: number;
  happiness: number;
  xp: number;
};

/** อาหาร (เน้นอาหารสุขภาพ) */
export const FOODS: Food[] = [
  { id: "banana", name: "กล้วยหอม", emoji: "🍌", price: 3, fullness: 15, happiness: 3, xp: 5 },
  { id: "sticky-rice", name: "ข้าวเหนียวหมูปิ้ง", emoji: "🍢", price: 6, fullness: 30, happiness: 6, xp: 10 },
  { id: "fruit-salad", name: "สลัดผลไม้", emoji: "🥗", price: 10, fullness: 40, happiness: 15, xp: 18 },
  { id: "mango", name: "มะม่วงสุก", emoji: "🥭", price: 15, fullness: 50, happiness: 25, xp: 28 },
];

export function findFood(id: string): Food | undefined {
  return FOODS.find((f) => f.id === id);
}
