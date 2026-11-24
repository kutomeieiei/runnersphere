"use client";

import Link from "next/link";
import { useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GAME_CONFIG } from "@/config/game";

/** ฉลองเมื่อถึงจุด + เตือนให้พักดื่มน้ำ */
export function RewardModal() {
  const { reward, dismissReward, missionNotice, dismissMissionNotice } = useGame();
  const [rest, setRest] = useState<null | "rest" | "cap">(null);

  function close() {
    const kind = reward?.dailyCapReached ? "cap" : reward?.restReminder ? "rest" : null;
    dismissReward();
    setRest(kind);
  }

  return (
    <>
      <Modal open={Boolean(reward)} title="ถึงแล้ว! 🎉" onClose={close}>
        {reward && (
          <div className="text-center">
            <p className="text-gray-700">
              คุณเดินมาถึง <b>{reward.spotName}</b> แล้ว
            </p>
            <div className="animate-pop-in my-4 text-5xl font-bold text-sun-500">+{reward.coins} 🪙</div>
            <p className="text-sm text-gray-600">
              วันนี้ไปแล้ว {reward.today.spots}/{GAME_CONFIG.health.dailySpotCap} จุด
              {reward.petLeveledUp && " · สัตว์เลี้ยงเลเวลอัป! ⭐"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/pet"
                onClick={close}
                className="flex min-h-12 items-center justify-center rounded-2xl bg-white font-semibold text-brand-800 ring-1 ring-brand-200"
              >
                ไปให้อาหาร 🍌
              </Link>
              <Button onClick={close}>เยี่ยม!</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={rest !== null}
        title={rest === "cap" ? "ครบโควตาวันนี้แล้ว 🏅" : "พักสักนิดนะ 💧"}
        onClose={() => setRest(null)}
      >
        <p className="text-gray-700">
          {rest === "cap"
            ? `วันนี้เดินครบ ${GAME_CONFIG.health.dailySpotCap} จุดแล้ว สุดยอด! พักผ่อน ดื่มน้ำ แล้วกลับมาเล่นใหม่พรุ่งนี้นะ`
            : "เดินมาหลายจุดแล้ว เก่งมาก! หาที่ร่มนั่งพัก ดื่มน้ำสักแก้ว แล้วค่อยไปต่อ"}
        </p>
        <Button className="mt-4 w-full" onClick={() => setRest(null)}>
          โอเค พักก่อน
        </Button>
      </Modal>

      <Modal open={Boolean(missionNotice)} title="ภารกิจจบแล้ว" onClose={dismissMissionNotice}>
        <p className="text-gray-700">{missionNotice}</p>
        <Button className="mt-4 w-full" onClick={dismissMissionNotice}>
          ตกลง
        </Button>
      </Modal>
    </>
  );
}
