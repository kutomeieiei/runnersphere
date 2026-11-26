"use client";

import { useRef, useState } from "react";
import { CoinBadge } from "@/components/game/CoinBadge";
import { MeGate } from "@/components/game/MeGate";
import { AccessoryIcon } from "@/components/pet/Accessories";
import { PetAvatar } from "@/components/pet/PetAvatar";
import { StatBar } from "@/components/pet/StatBar";
import { useGame } from "@/components/providers/GameProvider";
import { Alert } from "@/components/ui/Alert";
import {
  ACCESSORIES,
  FOODS,
  PET_SPECIES,
  SLOT_NAMES,
  type Accessory,
  type AccessorySlot,
  type Food,
} from "@/config/pets";
import { api, ApiClientError } from "@/lib/api-client";
import { MOOD_TEXT } from "@/lib/pet";

type Tab = "food" | "wardrobe" | "pets";
type Message = { tone: "error" | "success"; text: string } | null;

const TABS: { id: Tab; label: string }[] = [
  { id: "food", label: "🍌 อาหาร" },
  { id: "wardrobe", label: "🎩 แต่งตัว" },
  { id: "pets", label: "🐾 สัตว์เลี้ยง" },
];

export default function PetPage() {
  const { me, feed, refresh } = useGame();
  const [tab, setTab] = useState<Tab>("food");
  const [eating, setEating] = useState<(Food & { key: number }) | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [floaters, setFloaters] = useState<{ id: number; text: string }[]>([]);
  const [cheering, setCheering] = useState(false);
  const floaterId = useRef(0);

  if (!me) {
    return <MeGate />;
  }
  const { pet, profile } = me;
  const species = PET_SPECIES[pet.speciesId];

  function cheer() {
    setCheering(true);
    window.setTimeout(() => setCheering(false), 1800);
  }

  function float(text: string) {
    const id = ++floaterId.current;
    setFloaters((f) => [...f, { id, text }]);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1500);
    return id;
  }

  async function run(key: string, fn: () => Promise<void>) {
    setMessage(null);
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiClientError ? err.message : "เกิดข้อผิดพลาด" });
    } finally {
      setBusy(null);
    }
  }

  const onFeed = (food: Food) =>
    run(food.id, async () => {
      const res = await feed(food.id);
      const id = float(`+${food.fullness} อิ่ม  +${food.happiness} สุข`);
      setEating({ ...food, key: id });
      window.setTimeout(() => setEating(null), 1800);
      if (res.leveledUp) {
        setMessage({ tone: "success", text: `เลเวลอัป! ตอนนี้ ${res.pet.name} เลเวล ${res.pet.level} แล้ว ⭐` });
      }
    });

  const onAccessory = (body: Record<string, unknown>, key: string, text?: string) =>
    run(key, async () => {
      await api("/api/pet/accessory", { method: "POST", body });
      await refresh();
      if (text) {
        float(text);
        cheer();
      }
    });

  const onChoosePet = (speciesId: string, adopting: boolean) =>
    run(speciesId, async () => {
      await api("/api/pet/active", { method: "POST", body: { speciesId } });
      await refresh();
      const name = PET_SPECIES[speciesId]?.name ?? "";
      setMessage({
        tone: "success",
        text: adopting ? `ยินดีต้อนรับ ${name}! 🎉 ไปเดินเล่นด้วยกันเลย` : `${name} พร้อมออกเดินกับคุณแล้ว`,
      });
      cheer();
    });

  return (
    <main className="safe-top mx-auto max-w-md px-4 pb-28">
      <header className="flex items-center justify-between py-3">
        <h1 className="text-2xl font-bold text-brand-900">สัตว์เลี้ยงของฉัน</h1>
        <CoinBadge coins={profile.coins} />
      </header>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-100 to-brand-50 p-4 ring-1 ring-brand-100">
        <div className="flex items-baseline justify-between">
          <p className="text-xl font-bold text-brand-900">{pet.name}</p>
          <p className="text-sm font-semibold text-brand-700">เลเวล {pet.level}</p>
        </div>
        <p className="text-sm text-gray-600">{species?.description}</p>
        <div className="relative mx-auto mt-2 flex h-52 w-52 items-center justify-center">
          <PetAvatar
            speciesId={pet.speciesId}
            mood={pet.mood}
            eating={Boolean(eating) || cheering}
            equipped={pet.equipped}
            size={200}
          />
          {eating && (
            <span key={eating.key} className="animate-food-fly absolute left-1/2 top-1/2 -ml-5 -mt-2 text-4xl" aria-hidden>
              {eating.emoji}
            </span>
          )}
          {floaters.map((f) => (
            <span
              key={f.id}
              className="animate-float-up absolute top-12 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-brand-700 shadow"
            >
              {f.text}
            </span>
          ))}
        </div>
        <p className="mt-1 text-center font-medium text-gray-800">{eating ? "อร่อยจัง! 😋" : cheering ? "ชอบมากเลย! 💖" : MOOD_TEXT[pet.mood]}</p>

        <div className="mt-4 space-y-3 rounded-2xl bg-white/80 p-3">
          <StatBar label="ความอิ่ม" icon="🍚" value={pet.fullness} color="#f59e0b" />
          <StatBar label="ความสุข" icon="💖" value={pet.happiness} color="#ec4899" />
          <StatBar label={`XP สู่เลเวล ${pet.level + 1}`} icon="⭐" value={pet.xp} max={pet.xpToNext} color="#d23a0b" />
        </div>
      </section>

      {message && (
        <Alert tone={message.tone} className="mt-3">
          {message.text}
        </Alert>
      )}

      <div role="tablist" aria-label="หมวด" className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-brand-100/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-2 py-2 text-sm font-semibold transition ${
              tab === t.id ? "bg-white text-brand-900 shadow-sm" : "text-brand-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-3">
        {tab === "food" && <FoodShop coins={profile.coins} busy={busy} onFeed={onFeed} petName={pet.name} />}
        {tab === "wardrobe" && (
          <Wardrobe
            coins={profile.coins}
            inventory={me.inventory}
            equipped={pet.equipped ?? {}}
            busy={busy}
            onBuy={(a) => onAccessory({ action: "buy", accessoryId: a.id }, a.id, `ได้ ${a.name} แล้ว! ✨`)}
            onEquip={(a) => onAccessory({ action: "equip", accessoryId: a.id }, a.id, "เข้ากันมาก! ✨")}
            onUnequip={(slot, id) => onAccessory({ action: "unequip", slot }, id)}
          />
        )}
        {tab === "pets" && (
          <PetCollection
            pets={me.pets}
            bestLevel={me.bestLevel}
            busy={busy}
            equipped={pet.equipped}
            onChoose={onChoosePet}
          />
        )}
      </section>
    </main>
  );
}

function FoodShop({
  coins,
  busy,
  onFeed,
  petName,
}: {
  coins: number;
  busy: string | null;
  onFeed: (f: Food) => void;
  petName: string;
}) {
  return (
    <>
      <ul className="grid grid-cols-2 gap-3">
        {FOODS.map((food) => (
          <li key={food.id}>
            <button
              onClick={() => onFeed(food)}
              disabled={coins < food.price || Boolean(busy)}
              className="flex w-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-brand-100 transition active:scale-95 disabled:opacity-50"
            >
              <span className="text-4xl" aria-hidden>
                {food.emoji}
              </span>
              <span className="mt-1 font-semibold text-gray-900">{food.name}</span>
              <span className="text-xs text-gray-500">
                +{food.fullness} อิ่ม · +{food.happiness} สุข
              </span>
              <span className="mt-2 rounded-full bg-amber-100 px-3 py-0.5 text-sm font-bold text-amber-900">
                {busy === food.id ? "…" : `🪙 ${food.price}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-gray-500">
        ถ้าไม่ได้เล่นหลายวัน {petName} แค่หิวหรือเหงา ไม่เป็นอะไร ให้อาหารแล้วจะกลับมาร่าเริงเหมือนเดิม 💛
      </p>
    </>
  );
}

function Wardrobe({
  coins,
  inventory,
  equipped,
  busy,
  onBuy,
  onEquip,
  onUnequip,
}: {
  coins: number;
  inventory: string[];
  equipped: Partial<Record<AccessorySlot, string>>;
  busy: string | null;
  onBuy: (a: Accessory) => void;
  onEquip: (a: Accessory) => void;
  onUnequip: (slot: AccessorySlot, id: string) => void;
}) {
  const slots: AccessorySlot[] = ["head", "neck", "face"];
  return (
    <div className="space-y-4">
      {slots.map((slot) => (
        <div key={slot}>
          <h2 className="mb-2 text-sm font-semibold text-brand-900">{SLOT_NAMES[slot]}</h2>
          <ul className="grid grid-cols-3 gap-2">
            {ACCESSORIES.filter((a) => a.slot === slot).map((a) => {
              const owned = inventory.includes(a.id);
              const wearing = equipped[slot] === a.id;
              const label = wearing ? "ถอด" : owned ? "ใส่" : `🪙 ${a.price}`;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => (wearing ? onUnequip(slot, a.id) : owned ? onEquip(a) : onBuy(a))}
                    disabled={Boolean(busy) || (!owned && coins < a.price)}
                    aria-pressed={wearing}
                    className={`flex w-full flex-col items-center rounded-2xl bg-white p-2 text-center shadow-sm ring-1 transition active:scale-95 disabled:opacity-50 ${
                      wearing ? "ring-2 ring-brand-500" : "ring-brand-100"
                    }`}
                  >
                    <AccessoryIcon id={a.id} size={52} />
                    <span className="mt-1 line-clamp-2 min-h-8 text-xs font-medium leading-4 text-gray-900">{a.name}</span>
                    <span
                      className={`mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        owned ? "bg-brand-100 text-brand-800" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {busy === a.id ? "…" : label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-center text-xs text-gray-500">ซื้อครั้งเดียว ใส่ให้สัตว์เลี้ยงได้ทุกตัว</p>
    </div>
  );
}

function PetCollection({
  pets,
  bestLevel,
  busy,
  equipped,
  onChoose,
}: {
  pets: { speciesId: string; level: number; active: boolean }[];
  bestLevel: number;
  busy: string | null;
  equipped?: Partial<Record<AccessorySlot, string>>;
  onChoose: (speciesId: string, adopting: boolean) => void;
}) {
  const species = Object.values(PET_SPECIES).sort((a, b) => a.unlockLevel - b.unlockLevel);
  return (
    <>
      <ul className="grid grid-cols-2 gap-3">
        {species.map((s) => {
          const owned = pets.find((p) => p.speciesId === s.id);
          const unlocked = s.unlockLevel <= bestLevel;
          return (
            <li key={s.id}>
              <div
                className={`flex h-full flex-col items-center rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ${
                  owned?.active ? "ring-2 ring-brand-500" : "ring-brand-100"
                }`}
              >
                <div className={unlocked ? "" : "opacity-30 grayscale"}>
                  <PetAvatar
                    speciesId={s.id}
                    mood="happy"
                    size={92}
                    animate={false}
                    equipped={owned?.active ? equipped : undefined}
                  />
                </div>
                <p className="font-semibold text-gray-900">{unlocked ? s.name : "???"}</p>
                <p className="text-xs text-gray-500">
                  {owned ? `เลเวล ${owned.level}` : unlocked ? "ปลดล็อกแล้ว!" : `ปลดล็อกที่เลเวล ${s.unlockLevel}`}
                </p>
                <div className="mt-2 w-full">
                  {owned?.active ? (
                    <span className="block rounded-full bg-brand-100 py-1 text-xs font-bold text-brand-800">
                      กำลังออกเดินด้วยกัน
                    </span>
                  ) : owned ? (
                    <button
                      onClick={() => onChoose(s.id, false)}
                      disabled={Boolean(busy)}
                      className="w-full rounded-full bg-white py-1 text-xs font-bold text-brand-800 ring-1 ring-brand-300 disabled:opacity-50"
                    >
                      {busy === s.id ? "…" : "พาไปเดินด้วย"}
                    </button>
                  ) : unlocked ? (
                    <button
                      onClick={() => onChoose(s.id, true)}
                      disabled={Boolean(busy)}
                      className="w-full rounded-full bg-brand-600 py-1 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {busy === s.id ? "…" : "รับเลี้ยงฟรี"}
                    </button>
                  ) : (
                    <div
                      className="h-2 overflow-hidden rounded-full bg-gray-100"
                      role="progressbar"
                      aria-label={`ความคืบหน้าสู่เลเวล ${s.unlockLevel}`}
                      aria-valuenow={bestLevel}
                      aria-valuemin={1}
                      aria-valuemax={s.unlockLevel}
                    >
                      <div
                        className="h-full rounded-full bg-brand-400"
                        style={{ width: `${Math.min(100, (bestLevel / s.unlockLevel) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center text-xs text-gray-500">
        ปลดล็อกชนิดใหม่เมื่อสัตว์เลี้ยงตัวใดก็ได้ถึงเลเวลที่กำหนด · ตัวที่ไม่ได้ออกเดินด้วยจะพักอยู่บ้าน ความหิวไม่ลด
      </p>
    </>
  );
}
