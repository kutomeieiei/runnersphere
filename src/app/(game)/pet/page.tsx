"use client";

import { useRef, useState } from "react";
import { CoinBadge } from "@/components/game/CoinBadge";
import { PetAvatar } from "@/components/pet/PetAvatar";
import { StatBar } from "@/components/pet/StatBar";
import { useGame } from "@/components/providers/GameProvider";
import { Alert } from "@/components/ui/Alert";
import { FOODS, PET_SPECIES, type Food } from "@/config/pets";
import { ApiClientError } from "@/lib/api-client";
import { MOOD_TEXT } from "@/lib/pet";

export default function PetPage() {
  const { me, feed } = useGame();
  const [eating, setEating] = useState<(Food & { key: number }) | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [floaters, setFloaters] = useState<{ id: number; text: string }[]>([]);
  const floaterId = useRef(0);

  if (!me) {
    return <div className="p-6 text-center text-gray-500">กำลังโหลด…</div>;
  }
  const { pet, profile } = me;
  const species = PET_SPECIES[pet.speciesId];

  async function onFeed(food: Food) {
    setMessage(null);
    setBusy(food.id);
    try {
      const res = await feed(food.id);
      const id = ++floaterId.current;
      setEating({ ...food, key: id });
      setFloaters((f) => [...f, { id, text: `+${food.fullness} อิ่ม  +${food.happiness} สุข` }]);
      window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1500);
      window.setTimeout(() => setEating(null), 1800);
      if (res.leveledUp) setMessage({ tone: "success", text: `เลเวลอัป! ตอนนี้ ${res.pet.name} เลเวล ${res.pet.level} แล้ว ⭐` });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiClientError ? err.message : "เกิดข้อผิดพลาด" });
    } finally {
      setBusy(null);
    }
  }

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
          <PetAvatar speciesId={pet.speciesId} mood={pet.mood} eating={Boolean(eating)} size={200} />
          {eating && (
            <span key={eating.key} className="animate-food-fly absolute left-1/2 top-1/2 -ml-5 -mt-2 text-4xl" aria-hidden>
              {eating.emoji}
            </span>
          )}
          {floaters.map((f) => (
            <span key={f.id} className="animate-float-up absolute top-12 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-brand-700 shadow">
              {f.text}
            </span>
          ))}
        </div>
        <p className="mt-1 text-center font-medium text-gray-800">{eating ? "อร่อยจัง! 😋" : MOOD_TEXT[pet.mood]}</p>

        <div className="mt-4 space-y-3 rounded-2xl bg-white/80 p-3">
          <StatBar label="ความอิ่ม" icon="🍚" value={pet.fullness} color="#f79009" />
          <StatBar label="ความสุข" icon="💖" value={pet.happiness} color="#f063b8" />
          <StatBar label={`XP สู่เลเวล ${pet.level + 1}`} icon="⭐" value={pet.xp} max={pet.xpToNext} color="#12b76a" />
        </div>
      </section>

      {message && (
        <Alert tone={message.tone} className="mt-3">
          {message.text}
        </Alert>
      )}

      <section className="mt-5">
        <h2 className="mb-2 text-lg font-semibold text-brand-900">ร้านอาหาร</h2>
        <ul className="grid grid-cols-2 gap-3">
          {FOODS.map((food) => {
            const affordable = profile.coins >= food.price;
            return (
              <li key={food.id}>
                <button
                  onClick={() => void onFeed(food)}
                  disabled={!affordable || Boolean(busy)}
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
            );
          })}
        </ul>
        <p className="mt-4 text-center text-xs text-gray-500">
          ถ้าไม่ได้เล่นหลายวัน {pet.name} แค่หิวหรือเหงา ไม่เป็นอะไร ให้อาหารแล้วจะกลับมาร่าเริงเหมือนเดิม 💛
        </p>
      </section>
    </main>
  );
}
