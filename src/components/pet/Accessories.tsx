import type { AccessorySlot } from "@/config/pets";

/**
 * รูปวาดของแต่งตัว (SVG ในกรอบ 200×200 เดียวกับ PetAvatar)
 * ตำแหน่งอ้างอิง: หัวด้านบน y≈46, ตา y≈94 (x 76/124), คอ y≈140
 * เพิ่มชิ้นใหม่: เพิ่ม key ที่ตรงกับ id ใน src/config/pets.ts
 */
const ART: Record<string, React.ReactNode> = {
  "party-hat": (
    <g>
      <path d="M100 4 L124 58 L76 58 Z" fill="#7c5cff" />
      <path d="M88 31 L112 31 M82 45 L118 45" stroke="#ffd166" strokeWidth="5" strokeLinecap="round" />
      <circle cx="100" cy="6" r="7" fill="#ff6b8b" />
    </g>
  ),
  cap: (
    <g>
      <path d="M58 58 Q60 20 100 18 Q140 20 142 58 Z" fill="#12b76a" />
      <path d="M100 58 Q150 52 170 62 Q150 70 100 64 Z" fill="#05603a" />
      <circle cx="100" cy="20" r="5" fill="#05603a" />
      <path d="M76 42 Q100 30 124 42" stroke="#a6f4c5" strokeWidth="3" fill="none" />
    </g>
  ),
  "straw-hat": (
    <g>
      <ellipse cx="100" cy="56" rx="66" ry="14" fill="#e9c46a" />
      <path d="M66 56 Q68 18 100 18 Q132 18 134 56 Z" fill="#f4d58d" />
      <path d="M67 46 Q100 54 133 46 L134 56 Q100 64 66 56 Z" fill="#e76f51" />
      <path d="M50 58 Q100 72 150 58" stroke="#d4a64a" strokeWidth="2" fill="none" />
    </g>
  ),
  "flower-crown": (
    <g>
      <path d="M58 54 Q100 34 142 54" stroke="#5cb85c" strokeWidth="5" fill="none" />
      {[
        [62, 52, "#ff8fab"],
        [80, 44, "#ffd166"],
        [100, 40, "#ff6b8b"],
        [120, 44, "#a0c4ff"],
        [138, 52, "#ffd166"],
      ].map(([x, y, c]) => (
        <g key={`${x}`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={(x as number) + 6 * Math.cos((a * Math.PI) / 180)}
              cy={(y as number) + 6 * Math.sin((a * Math.PI) / 180)}
              r="5"
              fill={c as string}
            />
          ))}
          <circle cx={x as number} cy={y as number} r="4" fill="#fff3b0" />
        </g>
      ))}
    </g>
  ),
  "red-scarf": (
    <g>
      <path d="M40 132 Q100 156 160 132 L162 146 Q100 172 38 146 Z" fill="#e63946" />
      <path d="M128 146 L140 182 L124 184 L116 150 Z" fill="#c1121f" />
      <path d="M52 140 L56 152 M76 146 L78 158 M100 149 L100 161" stroke="#ffb3b3" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  "blue-bow": (
    <g>
      <path d="M100 142 L72 126 Q64 142 72 158 Z" fill="#4dabf7" />
      <path d="M100 142 L128 126 Q136 142 128 158 Z" fill="#4dabf7" />
      <circle cx="100" cy="142" r="9" fill="#1c7ed6" />
    </g>
  ),
  "bell-collar": (
    <g>
      <path d="M42 136 Q100 158 158 136 L158 144 Q100 166 42 144 Z" fill="#d6336c" />
      <circle cx="100" cy="160" r="11" fill="#fcc419" stroke="#e67700" strokeWidth="2" />
      <path d="M92 160 L108 160" stroke="#e67700" strokeWidth="2" />
      <circle cx="100" cy="165" r="2.5" fill="#7a4a00" />
    </g>
  ),
  "round-glasses": (
    <g fill="none" stroke="#3b2f2f" strokeWidth="4">
      <circle cx="76" cy="94" r="15" fill="#ffffff33" />
      <circle cx="124" cy="94" r="15" fill="#ffffff33" />
      <path d="M91 92 Q100 86 109 92" />
      <path d="M61 90 L46 84 M139 90 L154 84" />
    </g>
  ),
  sunglasses: (
    <g>
      <path d="M56 84 H96 Q96 106 76 106 Q56 106 56 84 Z" fill="#1f2937" />
      <path d="M104 84 H144 Q144 106 124 106 Q104 106 104 84 Z" fill="#1f2937" />
      <path d="M96 88 H104" stroke="#1f2937" strokeWidth="4" />
      <path d="M62 88 L74 88" stroke="#ffffff88" strokeWidth="3" strokeLinecap="round" />
      <path d="M110 88 L122 88" stroke="#ffffff88" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
};

/** มีรูปวาดของชิ้นนี้หรือไม่ (ใช้ใน test ตรวจ config) */
export function hasAccessoryArt(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ART, id);
}

/** ลำดับการวาด: คอ → หน้า → หัว (หมวกทับบนสุด) */
const ORDER: AccessorySlot[] = ["neck", "face", "head"];

export function AccessoryLayers({
  equipped,
  only,
}: {
  equipped?: Partial<Record<AccessorySlot, string>>;
  only?: AccessorySlot[];
}) {
  return (
    <>
      {ORDER.filter((s) => !only || only.includes(s)).map((slot) => {
        const id = equipped?.[slot];
        return id && ART[id] ? <g key={slot}>{ART[id]}</g> : null;
      })}
    </>
  );
}

/** รูปของชิ้นเดียว สำหรับแสดงในร้าน */
export function AccessoryIcon({ id, size = 56 }: { id: string; size?: number }) {
  const viewBox =
    id.includes("glasses")
      ? "40 70 120 50"
      : id.includes("scarf") || id.includes("bow") || id.includes("collar")
        ? "30 115 140 75"
        : "40 0 130 80";
  return (
    <svg viewBox={viewBox} width={size} height={size} aria-hidden>
      {ART[id]}
    </svg>
  );
}
