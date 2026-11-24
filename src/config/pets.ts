/**
 * ตั้งค่าสัตว์เลี้ยงและอาหาร
 *
 * เพิ่มชนิดสัตว์เลี้ยงใหม่: เพิ่ม entry ใน PET_SPECIES (id ห้ามซ้ำ, ห้ามเปลี่ยนภายหลัง)
 * เลือกรูปหูจาก EarShape ที่มีอยู่ หรือเพิ่มรูปใหม่ใน src/components/pet/PetAvatar.tsx
 */

export type EarShape = "round" | "bunny" | "cat" | "frog";

export type PetSpecies = {
  id: string;
  name: string;
  description: string;
  /** สีหลัก/สีท้อง/สีแก้ม ใช้วาดตัวละคร */
  colors: { body: string; belly: string; accent: string };
  /** รูปทรงหู (ใช้วาดใน PetAvatar) */
  ears: EarShape;
  /** ปลดล็อกเมื่อสัตว์เลี้ยงตัวใดตัวหนึ่งถึงเลเวลนี้ (1 = มีตั้งแต่เริ่ม) */
  unlockLevel: number;
};

/** เรียงตามเลเวลที่ปลดล็อก — เพิ่มชนิดใหม่ได้ที่นี่ */
export const PET_SPECIES: Record<string, PetSpecies> = {
  puifai: {
    id: "puifai",
    name: "ปุยฝ้าย",
    description: "ก้อนขนฟูนุ่มที่ชอบออกไปเดินเล่นด้วยกัน",
    colors: { body: "#ffd6a5", belly: "#fff3e0", accent: "#ff8fab" },
    ears: "round",
    unlockLevel: 1,
  },
  mali: {
    id: "mali",
    name: "มะลิ",
    description: "กระต่ายขาวหูยาว กระโดดเก่งที่สุดในโรงเรียน",
    colors: { body: "#f4f1fb", belly: "#ffffff", accent: "#f9a8d4" },
    ears: "bunny",
    unlockLevel: 3,
  },
  koko: {
    id: "koko",
    name: "โกโก้",
    description: "แมวสีโกโก้ ชอบนอนกลางแดดอ่อนๆ หลังเดินเสร็จ",
    colors: { body: "#c08b5c", belly: "#f3dcc4", accent: "#f4a7a0" },
    ears: "cat",
    unlockLevel: 5,
  },
  baitoey: {
    id: "baitoey",
    name: "ใบเตย",
    description: "เจ้ากบใบเตยตัวเขียว ร่าเริงทุกครั้งที่ฝนตก",
    colors: { body: "#86d993", belly: "#e3f8de", accent: "#f8b4b4" },
    ears: "frog",
    unlockLevel: 8,
  },
};

export const DEFAULT_SPECIES_ID = "puifai";

export function findSpecies(id: string): PetSpecies | undefined {
  return Object.prototype.hasOwnProperty.call(PET_SPECIES, id) ? PET_SPECIES[id] : undefined;
}

/** ตำแหน่งที่ใส่ของแต่งตัวได้ (ช่องละ 1 ชิ้น) */
export type AccessorySlot = "head" | "neck" | "face";

export const SLOT_NAMES: Record<AccessorySlot, string> = {
  head: "หัว",
  neck: "คอ",
  face: "หน้า",
};

export type Accessory = {
  id: string;
  name: string;
  slot: AccessorySlot;
  price: number;
};

/**
 * ของแต่งตัว — ซื้อครั้งเดียว ใช้ได้กับสัตว์เลี้ยงทุกตัว
 * เพิ่มชิ้นใหม่: เพิ่มที่นี่ และวาดรูปใน src/components/pet/Accessories.tsx (id ต้องตรงกัน)
 */
export const ACCESSORIES: Accessory[] = [
  { id: "party-hat", name: "หมวกปาร์ตี้", slot: "head", price: 20 },
  { id: "cap", name: "หมวกแก๊ปสีเขียว", slot: "head", price: 25 },
  { id: "straw-hat", name: "หมวกสาน", slot: "head", price: 30 },
  { id: "flower-crown", name: "มงกุฎดอกไม้", slot: "head", price: 40 },
  { id: "red-scarf", name: "ผ้าพันคอสีแดง", slot: "neck", price: 15 },
  { id: "blue-bow", name: "โบว์สีฟ้า", slot: "neck", price: 15 },
  { id: "bell-collar", name: "ปลอกคอกระดิ่ง", slot: "neck", price: 20 },
  { id: "round-glasses", name: "แว่นกลม", slot: "face", price: 20 },
  { id: "sunglasses", name: "แว่นกันแดด", slot: "face", price: 30 },
];

export function findAccessory(id: string): Accessory | undefined {
  return ACCESSORIES.find((a) => a.id === id);
}

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
