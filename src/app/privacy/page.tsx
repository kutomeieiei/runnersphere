import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "ความเป็นส่วนตัว" };

export default function PrivacyPage() {
  return (
    <main className="safe-top mx-auto w-full max-w-2xl px-5 pb-16">
      <Link href="/" className="mt-4 inline-block text-sm text-brand-700 underline">
        ← กลับ
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-brand-900">ความเป็นส่วนตัวและการใช้ตำแหน่ง</h1>
      <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        <b>RunSphere เป็นต้นแบบ (prototype) เพื่อการทดลอง</b> ยังไม่ใช่บริการจริง
        ข้อมูลอาจถูกล้างได้ระหว่างการทดลอง
      </div>

      <section className="mt-6 space-y-2 text-gray-800">
        <h2 className="text-lg font-semibold text-brand-800">แอปใช้ตำแหน่งเพื่ออะไร</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>ตรวจว่าคุณอยู่ในพื้นที่โรงเรียนก่อนเริ่มเกม</li>
          <li>เลือกจุดภารกิจที่อยู่ใกล้คุณพอเหมาะ</li>
          <li>ตรวจว่าคุณเดินไปถึงจุดภารกิจแล้ว เพื่อให้เหรียญ</li>
          <li>แสดงตำแหน่งของคุณและทิศทางไปยังจุดบนแผนที่ (เห็นเฉพาะคุณเท่านั้น)</li>
        </ul>
      </section>

      <section className="mt-6 space-y-2 text-gray-800">
        <h2 className="text-lg font-semibold text-brand-800">เราเก็บอะไร / ไม่เก็บอะไร</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>เก็บ:</b> อีเมล (ในระบบล็อกอินของ Firebase), ชื่อเล่น, เหรียญ, ค่าสถานะสัตว์เลี้ยง,
            ผลลัพธ์ภารกิจ (จุดไหน สำเร็จหรือไม่ ได้กี่เหรียญ ระยะทางโดยประมาณ) และสถิติรายวัน
          </li>
          <li>
            <b>ผู้เล่นคนอื่นเห็น:</b> เฉพาะชื่อเล่น จำนวนจุด และระยะทางรวมของสัปดาห์ ในกระดานอันดับ
            — ปิดได้ที่ <b>ตั้งค่า → แสดงชื่อในกระดานอันดับ</b> ปิดแล้วชื่อจะถูกลบออกทันที
          </li>
          <li>
            <b>ไม่เก็บ:</b> ประวัติเส้นทางการเดิน — ระหว่างทำภารกิจ ระบบจำเฉพาะตำแหน่งล่าสุด 1 จุด
            เพื่อกันการโกง และลบทิ้งทันทีเมื่อภารกิจจบ
          </li>
          <li>ไม่มีแชต ไม่มีระบบเพื่อน และไม่แสดงตำแหน่งของคุณให้ผู้เล่นคนอื่นเห็น</li>
          <li>ชื่อเล่นที่มีคำไม่สุภาพจะตั้งไม่ได้ เพราะคนอื่นมองเห็นในกระดานอันดับ</li>
          <li>ไม่ต้องใช้ชื่อจริง</li>
        </ul>
      </section>

      <section className="mt-6 space-y-2 text-gray-800">
        <h2 className="text-lg font-semibold text-brand-800">ลบบัญชี</h2>
        <p>
          ไปที่ <b>ตั้งค่า → ลบบัญชี</b> ระบบจะลบบัญชีและข้อมูลเกมทั้งหมดของคุณทันที และกู้คืนไม่ได้
        </p>
      </section>

      <section className="mt-6 space-y-2 text-gray-800">
        <h2 className="text-lg font-semibold text-brand-800">ความปลอดภัยขณะเล่น</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>มองทางเสมอขณะเดิน ไม่ก้มดูจอตลอดเวลา</li>
          <li>เดิน ไม่ต้องวิ่ง</li>
          <li>ห้ามเล่นขณะข้ามถนน หรือขึ้น-ลงบันได</li>
          <li>ไม่เข้าพื้นที่หวงห้ามหรือพื้นที่ที่ครูไม่อนุญาต</li>
          <li>พักและดื่มน้ำเป็นระยะ</li>
        </ul>
      </section>
    </main>
  );
}
