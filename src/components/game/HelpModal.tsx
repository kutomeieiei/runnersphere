"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GAME_CONFIG } from "@/config/game";
import { useShell } from "./GameShell";

const STEPS = [
  {
    icon: "🎯",
    title: "เลือกพื้นที่ แล้วสุ่มจุดภารกิจ",
    text: "เลือกพื้นที่เล่นจากปุ่มด้านบนแผนที่ (เดินเข้าพื้นที่ไหน แอปเลือกให้เอง) แล้วกด \"สุ่มจุดภารกิจ\"",
  },
  { icon: "🚶", title: "เดินไปที่ธงแดง", text: "ดูลูกศรและระยะทางในการ์ดด้านล่าง เดินอย่างปลอดภัย ไม่ต้องวิ่ง" },
  {
    icon: "⏳",
    title: "ยืนในวงสีแดงสักครู่",
    text: `เมื่อถึงวงสีแดง ยืนนิ่งๆ จนแถบยืนยันครบ ${GAME_CONFIG.arrival.requiredConsecutive} ช่อง (ประมาณ 10 วินาที)`,
  },
  { icon: "🪙", title: "รับเหรียญ", text: "ได้เหรียญตามระยะทาง นำไปซื้ออาหารหรือของแต่งตัวให้สัตว์เลี้ยง" },
];

const LEGEND = [
  { mark: <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow" />, text: "จุดสีฟ้า \"ฉัน\" = ตำแหน่งของคุณ" },
  { mark: <span className="text-base leading-none">🚩</span>, text: "ธง + วงสีแดง = จุดภารกิจ ต้องเข้าไปในวง" },
  { mark: <span className="inline-block h-3.5 w-5 rounded-sm border-2 border-[#ff6b35] bg-[#ff6b3514]" />, text: "กรอบสีส้ม = พื้นที่เล่นที่เลือก (เล่นได้เฉพาะในกรอบ)" },
];

const FAQ = [
  {
    q: "ปุ่มสุ่มจุดกดไม่ได้",
    a: "ดูข้อความใต้ปุ่ม จะบอกเหตุผล เช่น ยังไม่ได้สัญญาณ GPS, อยู่นอกพื้นที่เล่น หรือวันนี้ครบโควตาแล้ว",
  },
  {
    q: "ถึงจุดแล้วแต่ไม่นับ",
    a: "สัญญาณ GPS อาจไม่แม่นพอ ลองออกไปยืนที่โล่ง ห่างจากหลังคาหรืออาคาร แล้วยืนนิ่งๆ สักครู่",
  },
  { q: "ไม่ได้เล่นหลายวัน สัตว์เลี้ยงจะเป็นอะไรไหม", a: "ไม่ตายและไม่หายไป แค่หิวหรือเหงา ให้อาหาร 1–2 มื้อก็กลับมาร่าเริง" },
  { q: "คนอื่นเห็นตำแหน่งฉันไหม", a: "ไม่เห็น คนอื่นเห็นแค่ชื่อเล่นและจำนวนจุดในกระดานอันดับ (ซ่อนได้ในตั้งค่า)" },
];

/** วิธีเล่น + ความหมายของสัญลักษณ์ + คำถามที่พบบ่อย (Nielsen #10 Help and documentation) */
export function HelpModal() {
  const { helpOpen, closeHelp } = useShell();
  return (
    <Modal open={helpOpen} title="วิธีเล่น Movemai" onClose={closeHelp}>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg" aria-hidden>
              {s.icon}
            </span>
            <span>
              <span className="block font-semibold text-gray-900">
                {i + 1}. {s.title}
              </span>
              <span className="block text-sm text-gray-600">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-brand-900">สัญลักษณ์บนแผนที่</h3>
      <ul className="space-y-2 text-sm text-gray-700">
        {LEGEND.map((l) => (
          <li key={l.text} className="flex items-center gap-3">
            <span className="flex w-6 justify-center">{l.mark}</span>
            {l.text}
          </li>
        ))}
      </ul>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-brand-900">คำถามที่พบบ่อย</h3>
      <div className="divide-y divide-gray-100 rounded-2xl ring-1 ring-gray-100">
        {FAQ.map((f) => (
          <details key={f.q} className="group px-3 py-2">
            <summary className="cursor-pointer list-none text-sm font-medium text-gray-900">
              <span className="mr-1 inline-block transition group-open:rotate-90" aria-hidden>
                ›
              </span>
              {f.q}
            </summary>
            <p className="mt-1 text-sm text-gray-600">{f.a}</p>
          </details>
        ))}
      </div>

      <Button className="mt-5 w-full" onClick={closeHelp}>
        เข้าใจแล้ว
      </Button>
    </Modal>
  );
}

/** ปุ่ม "?" เปิดวิธีเล่นได้จากทุกหน้า */
export function HelpButton({ className = "" }: { className?: string }) {
  const { openHelp } = useShell();
  return (
    <button
      type="button"
      onClick={openHelp}
      aria-label="วิธีเล่น"
      className={`pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base font-bold text-brand-700 shadow-sm ring-1 ring-brand-100 ${className}`}
    >
      ?
    </button>
  );
}
