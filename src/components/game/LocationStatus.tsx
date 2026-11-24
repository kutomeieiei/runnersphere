"use client";

import { useGeo } from "@/components/providers/GeoProvider";
import { Alert } from "@/components/ui/Alert";
import { GEOFENCE } from "@/config/game";
import { ERROR_MESSAGES } from "@/lib/errors";
import { pointInPolygon } from "@/lib/geo";

/** ข้อความสถานะ GPS / สิทธิ์ตำแหน่ง / อยู่นอกพื้นที่ */
export function LocationStatus() {
  const { status, fix, accuracyLevel, stale } = useGeo();

  if (status === "denied") {
    return (
      <Alert tone="error" title="ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง">
        เกมต้องใช้ตำแหน่งเพื่อหาจุดภารกิจ เปิดสิทธิ์ได้ที่:
        <ul className="mt-1 list-disc pl-5">
          <li>
            <b>iPhone:</b> การตั้งค่า → ความเป็นส่วนตัว → บริการหาตำแหน่ง → Safari/เบราว์เซอร์ →
            &quot;ขณะใช้แอป&quot; และเปิด &quot;ตำแหน่งที่แม่นยำ&quot;
          </li>
          <li>
            <b>Android/Chrome:</b> แตะไอคอนแม่กุญแจข้างแถบที่อยู่ → สิทธิ์ → ตำแหน่ง → อนุญาต
          </li>
        </ul>
        แล้วรีเฟรชหน้านี้
      </Alert>
    );
  }
  if (status === "insecure") {
    return <Alert tone="error">ต้องเปิดผ่าน https:// เท่านั้นจึงจะใช้ตำแหน่งได้</Alert>;
  }
  if (status === "unsupported") {
    return <Alert tone="error">เบราว์เซอร์นี้ไม่รองรับการใช้ตำแหน่ง ลองใช้ Chrome หรือ Safari</Alert>;
  }
  if (status === "unavailable" || status === "timeout") {
    return (
      <Alert tone="warning" title="ยังหาตำแหน่งไม่ได้">
        ตรวจว่าเปิด GPS/บริการตำแหน่งในเครื่องแล้ว และลองออกไปที่โล่ง
      </Alert>
    );
  }
  if (status === "requesting" || (status === "watching" && !fix)) {
    return <Alert tone="info">กำลังหาตำแหน่งของคุณ…</Alert>;
  }
  if (!fix) return null;

  if (accuracyLevel === "approximate") {
    return (
      <Alert tone="warning" title="ตำแหน่งไม่แม่นมาก (อาจเปิดตำแหน่งโดยประมาณอยู่)">
        {ERROR_MESSAGES.approximate_location}
        <br />
        iPhone: การตั้งค่า → ความเป็นส่วนตัว → บริการหาตำแหน่ง → เบราว์เซอร์ → เปิด &quot;ตำแหน่งที่แม่นยำ&quot;
        · Android: การตั้งค่า → ตำแหน่ง → เปิด &quot;ความแม่นยำของตำแหน่ง&quot;
      </Alert>
    );
  }
  if (stale) {
    return <Alert tone="warning">ไม่ได้รับตำแหน่งใหม่สักพักแล้ว ตรวจสัญญาณ GPS</Alert>;
  }
  if (!pointInPolygon(fix, GEOFENCE.polygon)) {
    return (
      <Alert tone="warning" title="อยู่นอกพื้นที่โรงเรียน">
        {ERROR_MESSAGES.outside_geofence}
      </Alert>
    );
  }
  if (accuracyLevel === "poor") {
    return (
      <Alert tone="warning">
        GPS คลาดเคลื่อน ±{Math.round(fix.accuracy)} ม. — {ERROR_MESSAGES.poor_accuracy}
      </Alert>
    );
  }
  return null;
}
