import { PET_CONFIG, type Food } from "@/config/pets";

export type PetState = {
  speciesId: string;
  name: string;
  fullness: number;
  happiness: number;
  xp: number;
  level: number;
  /** เวลาที่คำนวณค่าสถานะล่าสุด (ms) */
  updatedAt: number;
};

export type PetMood = "happy" | "ok" | "hungry" | "tired";

type PetCfg = typeof PET_CONFIG;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * คำนวณค่าสถานะ ณ เวลา now (ลดลงตามเวลาที่ผ่านไป)
 * ค่าไม่ลดต่ำกว่า minStat — สัตว์เลี้ยงไม่ตาย ไม่หายไป
 * และถ้าค่าต่ำกว่า minStat อยู่แล้ว (ไม่ควรเกิด) ก็จะไม่ถูกดันขึ้นหรือลง
 */
export function applyDecay(pet: PetState, nowMs: number, cfg: PetCfg = PET_CONFIG): PetState {
  const hours = Math.max(0, nowMs - pet.updatedAt) / 3_600_000;
  if (hours === 0) return pet;
  const decay = (value: number, perHour: number) =>
    value <= cfg.minStat ? value : Math.max(cfg.minStat, value - perHour * hours);
  return {
    ...pet,
    fullness: round1(decay(pet.fullness, cfg.fullnessDecayPerHour)),
    happiness: round1(decay(pet.happiness, cfg.happinessDecayPerHour)),
    updatedAt: nowMs,
  };
}

/** เพิ่ม XP และเลื่อนเลเวล (เลเวลไม่ลดลง) */
export function addXp(pet: PetState, xp: number, cfg: PetCfg = PET_CONFIG): PetState {
  let level = pet.level;
  let total = pet.xp + Math.max(0, xp);
  while (level < cfg.maxLevel && total >= cfg.xpForLevel(level)) {
    total -= cfg.xpForLevel(level);
    level += 1;
  }
  if (level >= cfg.maxLevel) total = Math.min(total, cfg.xpForLevel(level));
  return { ...pet, level, xp: total };
}

/** ให้อาหาร (ต้องเรียก applyDecay ก่อน) */
export function feedPet(pet: PetState, food: Food, cfg: PetCfg = PET_CONFIG): PetState {
  const fed = {
    ...pet,
    fullness: clamp(pet.fullness + food.fullness, 0, cfg.maxStat),
    happiness: clamp(pet.happiness + food.happiness, 0, cfg.maxStat),
  };
  return addXp(fed, food.xp, cfg);
}

/** รางวัลเมื่อทำภารกิจสำเร็จ: ได้ออกไปเดินด้วยกัน มีความสุขขึ้น */
export function rewardPetForMission(pet: PetState, cfg: PetCfg = PET_CONFIG): PetState {
  const happier = {
    ...pet,
    happiness: clamp(pet.happiness + cfg.missionHappinessBonus, 0, cfg.maxStat),
  };
  return addXp(happier, cfg.missionXp, cfg);
}

export function petMood(pet: Pick<PetState, "fullness" | "happiness">, cfg: PetCfg = PET_CONFIG): PetMood {
  if (pet.fullness < cfg.lowThreshold) return "hungry";
  if (pet.happiness < cfg.lowThreshold) return "tired";
  if (pet.fullness >= 70 && pet.happiness >= 70) return "happy";
  return "ok";
}

export const MOOD_TEXT: Record<PetMood, string> = {
  happy: "อารมณ์ดีมาก! 💖",
  ok: "สบายดี",
  hungry: "หิวนิดหน่อย… ให้อาหารหน่อยนะ",
  tired: "เหงาและเหนื่อยนิดหน่อย ออกไปเดินด้วยกันไหม?",
};

export function newPet(speciesId: string, name: string, nowMs: number, cfg: PetCfg = PET_CONFIG): PetState {
  return {
    speciesId,
    name,
    fullness: cfg.start.fullness,
    happiness: cfg.start.happiness,
    xp: 0,
    level: 1,
    updatedAt: nowMs,
  };
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}
