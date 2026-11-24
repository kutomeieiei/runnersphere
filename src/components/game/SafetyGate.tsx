"use client";

import { useEffect, useState } from "react";
import { useGeo } from "@/components/providers/GeoProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { dateKey } from "@/lib/time";
import { SAFETY_ACK_KEY } from "@/lib/storage-keys";

export const SAFETY_RULES = [
  { icon: "👀", text: "มองทางเสมอขณะเดิน อย่าก้มดูจอตลอดเวลา" },
  { icon: "🚶", text: "เดิน ไม่ต้องวิ่ง" },
  { icon: "🚸", text: "ห้ามเล่นขณะข้ามถนน หรือขึ้น-ลงบันได — หยุดก่อนแล้วค่อยดู" },
  { icon: "⛔", text: "ไม่เข้าพื้นที่หวงห้าม หรือที่ที่ครูไม่อนุญาต" },
  { icon: "💧", text: "พักและดื่มน้ำเป็นระยะ ถ้าเหนื่อยให้หยุดพัก" },
];

function ackedToday(): boolean {
  try {
    return localStorage.getItem(SAFETY_ACK_KEY) === dateKey(Date.now());
  } catch {
    return false;
  }
}

/** แสดงคำเตือนความปลอดภัยก่อนเล่น (วันละครั้ง) แล้วจึงเริ่มขอตำแหน่ง */
export function SafetyGate() {
  const geo = useGeo();
  // component นี้ render เฉพาะฝั่ง client (หลังโหลดสถานะล็อกอิน) จึงอ่าน localStorage ตอนเริ่มได้
  const [open, setOpen] = useState(() => !ackedToday());
  const { start } = geo;

  useEffect(() => {
    if (!open) start();
  }, [open, start]);

  function accept() {
    try {
      localStorage.setItem(SAFETY_ACK_KEY, dateKey(Date.now()));
    } catch {}
    setOpen(false);
  }

  return (
    <Modal open={open} title="ก่อนเริ่มเล่น อ่านนิดนึงนะ 🙌" dismissible={false}>
      <ul className="space-y-3">
        {SAFETY_RULES.map((r) => (
          <li key={r.text} className="flex gap-3">
            <span className="text-2xl" aria-hidden>
              {r.icon}
            </span>
            <span className="pt-0.5 text-gray-800">{r.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
        เกมจะขอใช้ตำแหน่งของคุณเพื่อหาจุดภารกิจและตรวจว่าไปถึงแล้ว ตำแหน่งไม่ถูกแสดงให้คนอื่นเห็น
      </p>
      <Button className="mt-4 w-full" onClick={accept}>
        เข้าใจแล้ว เริ่มเลย
      </Button>
    </Modal>
  );
}
