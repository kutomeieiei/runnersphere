"use client";

import { useGeo } from "@/components/providers/GeoProvider";
import { Alert } from "@/components/ui/Alert";
import { distanceToArea, findAreaAt } from "@/lib/areas";
import { formatDistance } from "@/lib/geo";
import { useShell } from "./GameShell";

/**
 * ข้อความสถานะ GPS / สิทธิ์ตำแหน่ง / อยู่นอกพื้นที่
 * หลักการ (Nielsen #8 minimalist, #9 recover from errors):
 * - หัวข้อบอกปัญหาสั้นๆ + 1 บรรทัดบอกว่าต้องทำอะไร
 * - มีปุ่มลงมือแก้ได้ทันที
 * - รายละเอียดแยกตามรุ่นมือถือซ่อนไว้ใน "ดูวิธี" ไม่ให้รกจอ
 */
export function LocationStatus() {
  const { status, fix, accuracyLevel, stale, requestFresh } = useGeo();
  const { area } = useShell();

  if (status === "denied") {
    return (
      <Alert tone="error" title="ยังไม่ได้อนุญาตให้ใช้ตำแหน่ง">
        เกมต้องรู้ตำแหน่งเพื่อหาจุดภารกิจ เปิดสิทธิ์แล้วกด &quot;ลองใหม่&quot;
        <PhoneSteps
          iphone='การตั้งค่า → ความเป็นส่วนตัว → บริการหาตำแหน่ง → Safari → "ขณะใช้แอป" และเปิด "ตำแหน่งที่แม่นยำ"'
          android='แตะไอคอน 🔒 ข้างช่องที่อยู่เว็บ → สิทธิ์ → ตำแหน่ง → อนุญาต'
        />
        <RetryButton onClick={() => window.location.reload()} />
      </Alert>
    );
  }
  if (status === "insecure") {
    return <Alert tone="error">ต้องเปิดเว็บผ่าน https:// เท่านั้นจึงจะใช้ตำแหน่งได้</Alert>;
  }
  if (status === "unsupported") {
    return <Alert tone="error">เบราว์เซอร์นี้ใช้ตำแหน่งไม่ได้ ลองเปิดด้วย Chrome หรือ Safari</Alert>;
  }
  if (status === "unavailable" || status === "timeout") {
    return (
      <Alert tone="warning" title="ยังหาตำแหน่งไม่เจอ">
        เปิด GPS ในเครื่อง แล้วออกไปที่โล่ง
        <RetryButton onClick={requestFresh} />
      </Alert>
    );
  }
  if (status === "requesting" || (status === "watching" && !fix)) {
    return <Alert tone="info">กำลังหาตำแหน่งของคุณ… ครั้งแรกอาจใช้เวลา 10–30 วินาที</Alert>;
  }
  if (!fix) return null;

  if (accuracyLevel === "approximate") {
    return (
      <Alert tone="warning" title="ตำแหน่งยังไม่แม่นยำ">
        เครื่องอาจเปิด &quot;ตำแหน่งโดยประมาณ&quot; อยู่ ให้เปิด &quot;ตำแหน่งที่แม่นยำ&quot;
        <PhoneSteps
          iphone='การตั้งค่า → ความเป็นส่วนตัว → บริการหาตำแหน่ง → Safari → เปิด "ตำแหน่งที่แม่นยำ"'
          android='การตั้งค่า → ตำแหน่ง → เปิด "ความแม่นยำของตำแหน่ง"'
        />
      </Alert>
    );
  }
  if (stale) {
    return (
      <Alert tone="warning">
        ไม่ได้รับตำแหน่งใหม่สักพักแล้ว
        <RetryButton onClick={requestFresh} />
      </Alert>
    );
  }
  if (!findAreaAt(fix)) {
    return (
      <Alert tone="warning" title={`อยู่นอกพื้นที่เล่น · ห่าง${area.shortName}ประมาณ ${formatDistance(distanceToArea(fix, area))}`}>
        เดินเข้าไปในกรอบสีส้ม หรือกดเลือกพื้นที่อื่นที่ใกล้กว่า
      </Alert>
    );
  }
  if (accuracyLevel === "poor") {
    return <Alert tone="warning">GPS ยังอ่อน ลองยืนที่โล่ง ห่างจากหลังคาหรืออาคารสักครู่</Alert>;
  }
  return null;
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 block rounded-lg bg-white/80 px-3 py-1.5 text-sm font-semibold ring-1 ring-current/20"
    >
      ลองใหม่
    </button>
  );
}

function PhoneSteps({ iphone, android }: { iphone: string; android: string }) {
  return (
    <details className="mt-1">
      <summary className="cursor-pointer font-semibold underline">ดูวิธีเปิด</summary>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li>
          <b>iPhone:</b> {iphone}
        </li>
        <li>
          <b>Android:</b> {android}
        </li>
      </ul>
    </details>
  );
}
