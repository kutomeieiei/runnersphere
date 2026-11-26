"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/**
 * แสดงสถานะระหว่างรอข้อมูลผู้เล่น (/api/me) — ใช้แทนข้อความ "กำลังโหลด…" เปล่าๆ
 * ถ้าโหลดไม่สำเร็จจะบอกสาเหตุพร้อมปุ่มลองใหม่ แทนที่จะค้างไปเรื่อยๆ
 */
export function MeGate() {
  const { loading, error, refresh, needsProfile } = useGame();
  const [slow, setSlow] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const id = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(id);
  }, [loading]);

  if (needsProfile) return null; // หน้าต่างตั้งชื่อเล่นจะแสดงแทน

  if (error && !loading) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6">
        <Alert tone="error" title="โหลดข้อมูลไม่สำเร็จ">
          {error.message}
        </Alert>
        <Button
          className="w-full"
          loading={retrying}
          onClick={async () => {
            setRetrying(true);
            await refresh();
            setRetrying(false);
          }}
        >
          ลองใหม่
        </Button>
        <p className="text-center text-xs text-gray-500">
          ถ้ายังไม่หาย ผู้ดูแลเปิด <code>/api/health</code> เพื่อตรวจการตั้งค่าระบบได้
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center text-gray-600">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" aria-hidden />
      <span>กำลังโหลด…</span>
      {slow && <span className="text-sm">ใช้เวลานานกว่าปกติ ตรวจสัญญาณอินเทอร์เน็ต หรือรอสักครู่</span>}
    </div>
  );
}
