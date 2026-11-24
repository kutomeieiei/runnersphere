import { DEFAULT_SPECIES_ID, PET_SPECIES, type AccessorySlot, type EarShape } from "@/config/pets";
import type { PetMood } from "@/lib/pet";
import { AccessoryLayers } from "./Accessories";

/** เส้นขอบจางๆ ให้ตัวสีอ่อน (เช่น กระต่ายขาว) ไม่กลืนกับพื้นหลังสีขาว */
const OUTLINE = "#3b2f2f1f";

/**
 * ตัวละครสัตว์เลี้ยง (วาดด้วย SVG) — ทุกชนิดใช้ลำตัวเดียวกัน ต่างกันที่สีและหู
 * เพื่อให้ของแต่งตัววางตำแหน่งเดียวกันได้ทุกชนิด
 */
export function PetAvatar({
  speciesId,
  mood,
  eating = false,
  size = 200,
  equipped,
  animate = true,
}: {
  speciesId: string;
  mood: PetMood;
  eating?: boolean;
  size?: number;
  equipped?: Partial<Record<AccessorySlot, string>>;
  animate?: boolean;
}) {
  const species = PET_SPECIES[speciesId] ?? PET_SPECIES[DEFAULT_SPECIES_ID];
  const { body, belly, accent } = species.colors;
  const sleepy = mood === "tired";
  const sad = mood === "hungry";
  const hasGlasses = Boolean(equipped?.face);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`${species.name} (${mood})`}
      className={animate ? (eating ? "animate-pet-bounce" : "animate-pet-idle") : undefined}
    >
      {/* เงา */}
      <ellipse cx="100" cy="182" rx="56" ry="9" fill="#00000018" />
      <Ears shape={species.ears} body={body} accent={accent} />
      {/* ตัว */}
      <ellipse cx="100" cy="112" rx="70" ry="66" fill={body} stroke={OUTLINE} strokeWidth="2" />
      <ellipse cx="100" cy="130" rx="44" ry="38" fill={belly} />
      {species.ears === "frog" && <FrogEyes body={body} />}
      {/* แก้ม */}
      <circle cx="58" cy="112" r="10" fill={accent} opacity={sad ? 0.25 : 0.55} />
      <circle cx="142" cy="112" r="10" fill={accent} opacity={sad ? 0.25 : 0.55} />
      {species.ears === "cat" && (
        <g stroke="#5b3a1e" strokeWidth="2" strokeLinecap="round" opacity="0.6">
          <path d="M40 108 L62 110 M40 118 L62 116 M160 108 L138 110 M160 118 L138 116" />
        </g>
      )}
      {/* ตา (ถ้าใส่แว่นกันแดดจะถูกบัง) */}
      {!(equipped?.face === "sunglasses") &&
        (sleepy ? (
          <>
            <path d="M66 94 q10 6 20 0" stroke="#3b2f2f" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M114 94 q10 6 20 0" stroke="#3b2f2f" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : mood === "happy" || eating ? (
          <>
            <path d="M66 96 q10 -12 20 0" stroke="#3b2f2f" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M114 96 q10 -12 20 0" stroke="#3b2f2f" strokeWidth="5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="76" cy="94" r="8" fill="#3b2f2f" />
            <circle cx="124" cy="94" r="8" fill="#3b2f2f" />
            <circle cx="79" cy="91" r="2.5" fill="#fff" />
            <circle cx="127" cy="91" r="2.5" fill="#fff" />
            {sad && !hasGlasses && (
              <>
                <path d="M64 80 l16 4" stroke="#3b2f2f" strokeWidth="3" strokeLinecap="round" />
                <path d="M136 80 l-16 4" stroke="#3b2f2f" strokeWidth="3" strokeLinecap="round" />
              </>
            )}
          </>
        ))}
      {/* ปาก */}
      {eating ? (
        <ellipse className="animate-chomp" cx="100" cy="116" rx="10" ry="8" fill="#7a2e2e" />
      ) : sad ? (
        <path d="M90 120 q10 -8 20 0" stroke="#3b2f2f" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M88 112 q12 12 24 0" stroke="#3b2f2f" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      <AccessoryLayers equipped={equipped} />
      {sleepy && (
        <text x="150" y="60" fontSize="22" fill="#6b7280" fontWeight="bold">
          z<tspan fontSize="16" dy="-8">z</tspan>
        </text>
      )}
    </svg>
  );
}

function Ears({ shape, body, accent }: { shape: EarShape; body: string; accent: string }) {
  switch (shape) {
    case "bunny":
      return (
        <>
          <ellipse cx="74" cy="34" rx="14" ry="40" fill={body} stroke={OUTLINE} strokeWidth="2" transform="rotate(-12 74 34)" />
          <ellipse cx="126" cy="34" rx="14" ry="40" fill={body} stroke={OUTLINE} strokeWidth="2" transform="rotate(12 126 34)" />
          <ellipse cx="74" cy="36" rx="7" ry="28" fill={accent} opacity="0.6" transform="rotate(-12 74 36)" />
          <ellipse cx="126" cy="36" rx="7" ry="28" fill={accent} opacity="0.6" transform="rotate(12 126 36)" />
        </>
      );
    case "cat":
      return (
        <>
          <path d="M44 78 L52 24 L90 52 Z" fill={body} stroke={OUTLINE} strokeWidth="2" />
          <path d="M156 78 L148 24 L110 52 Z" fill={body} stroke={OUTLINE} strokeWidth="2" />
          <path d="M56 64 L58 38 L78 54 Z" fill={accent} opacity="0.7" />
          <path d="M144 64 L142 38 L122 54 Z" fill={accent} opacity="0.7" />
        </>
      );
    case "frog":
      return null; // กบไม่มีหู — วาดตาโปนแทน (FrogEyes)
    default:
      return (
        <>
          <ellipse cx="62" cy="52" rx="16" ry="24" fill={body} stroke={OUTLINE} strokeWidth="2" transform="rotate(-20 62 52)" />
          <ellipse cx="138" cy="52" rx="16" ry="24" fill={body} stroke={OUTLINE} strokeWidth="2" transform="rotate(20 138 52)" />
          <ellipse cx="62" cy="54" rx="8" ry="13" fill={accent} opacity="0.6" transform="rotate(-20 62 54)" />
          <ellipse cx="138" cy="54" rx="8" ry="13" fill={accent} opacity="0.6" transform="rotate(20 138 54)" />
        </>
      );
  }
}

function FrogEyes({ body }: { body: string }) {
  // ปุ่มตาโปนบนหัวกบ (ใบหน้ายังใช้ตาชุดเดียวกับชนิดอื่น เพื่อให้แว่นวางตรงกัน)
  return (
    <>
      <circle cx="70" cy="56" r="20" fill={body} stroke={OUTLINE} strokeWidth="2" />
      <circle cx="130" cy="56" r="20" fill={body} stroke={OUTLINE} strokeWidth="2" />
      <circle cx="70" cy="54" r="9" fill="#ffffff" opacity="0.55" />
      <circle cx="130" cy="54" r="9" fill="#ffffff" opacity="0.55" />
    </>
  );
}
