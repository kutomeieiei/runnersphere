"use client";

import { useGame } from "@/components/providers/GameProvider";
import { CoinBadge } from "./CoinBadge";
import { HelpButton } from "./HelpModal";

/**
 * หัวหน้ามาตรฐานของทุกหน้าในเกม: ชื่อหน้า + คำอธิบายสั้น + เหรียญ + ปุ่มช่วยเหลือ
 * (Nielsen #4 Consistency — ทุกหน้าหน้าตาและตำแหน่งเหมือนกัน, #1 เห็นเหรียญคงเหลือเสมอ)
 */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const { me } = useGame();
  return (
    <header className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-brand-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {me && <CoinBadge coins={me.profile.coins} />}
        <HelpButton />
      </div>
    </header>
  );
}
