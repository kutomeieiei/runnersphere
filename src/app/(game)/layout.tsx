"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { GameShell } from "@/components/game/GameShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { GameProvider } from "@/components/providers/GameProvider";
import { GeoProvider } from "@/components/providers/GeoProvider";
import { GAME_CONFIG } from "@/config/game";

/**
 * layout ของหน้าเกมทั้งหมด (/play, /pet, /stats, /settings)
 * - กันผู้ใช้ที่ยังไม่ล็อกอิน
 * - แผนที่ถูก mount ที่นี่ครั้งเดียว จึงไม่ remount เมื่อสลับหน้า (ประหยัด map load)
 */
export default function GameLayout({ children }: LayoutProps<"/">) {
  const { user, loading, configured, signingOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const needsVerify = GAME_CONFIG.features.requireEmailVerification && user && !user.emailVerified;

  useEffect(() => {
    if (loading || signingOut) return;
    if (!user) router.replace(`/login?reason=required&next=${encodeURIComponent(pathname)}`);
    else if (needsVerify) router.replace("/verify-email");
  }, [loading, signingOut, user, needsVerify, router, pathname]);

  if (!configured) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="text-lg font-semibold">ยังไม่ได้ตั้งค่า Firebase</p>
        <p className="mt-2 text-sm text-gray-600">ใส่ค่า NEXT_PUBLIC_FIREBASE_* ใน .env.local (ดู README)</p>
      </main>
    );
  }

  if (loading || !user || needsVerify) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-brand-800">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <span>กำลังโหลด…</span>
        </div>
      </main>
    );
  }

  return (
    <GeoProvider active>
      <GameProvider>
        <GameShell>{children}</GameShell>
      </GameProvider>
    </GeoProvider>
  );
}
