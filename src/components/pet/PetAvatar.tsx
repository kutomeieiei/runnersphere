import { PET_SPECIES, DEFAULT_SPECIES_ID } from "@/config/pets";
import type { PetMood } from "@/lib/pet";

/**
 * ตัวละครสัตว์เลี้ยง (วาดด้วย SVG) — ชนิดใหม่เพิ่มสีใน config/pets.ts
 * หรือเพิ่มรูปวาดเฉพาะชนิดใน switch ด้านล่างได้
 */
export function PetAvatar({
  speciesId,
  mood,
  eating = false,
  size = 200,
}: {
  speciesId: string;
  mood: PetMood;
  eating?: boolean;
  size?: number;
}) {
  const species = PET_SPECIES[speciesId] ?? PET_SPECIES[DEFAULT_SPECIES_ID];
  const { body, belly, accent } = species.colors;
  const sleepy = mood === "tired";
  const sad = mood === "hungry";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`${species.name} (${mood})`}
      className={eating ? "animate-pet-bounce" : "animate-pet-idle"}
    >
      {/* เงา */}
      <ellipse cx="100" cy="182" rx="56" ry="9" fill="#00000018" />
      {/* หู */}
      <ellipse cx="62" cy="52" rx="16" ry="24" fill={body} transform="rotate(-20 62 52)" />
      <ellipse cx="138" cy="52" rx="16" ry="24" fill={body} transform="rotate(20 138 52)" />
      <ellipse cx="62" cy="54" rx="8" ry="13" fill={accent} opacity="0.6" transform="rotate(-20 62 54)" />
      <ellipse cx="138" cy="54" rx="8" ry="13" fill={accent} opacity="0.6" transform="rotate(20 138 54)" />
      {/* ตัว */}
      <ellipse cx="100" cy="112" rx="70" ry="66" fill={body} />
      <ellipse cx="100" cy="130" rx="44" ry="38" fill={belly} />
      {/* แก้ม */}
      <circle cx="58" cy="112" r="10" fill={accent} opacity={sad ? 0.25 : 0.55} />
      <circle cx="142" cy="112" r="10" fill={accent} opacity={sad ? 0.25 : 0.55} />
      {/* ตา */}
      {sleepy ? (
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
          {sad && (
            <>
              <path d="M64 80 l16 4" stroke="#3b2f2f" strokeWidth="3" strokeLinecap="round" />
              <path d="M136 80 l-16 4" stroke="#3b2f2f" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
        </>
      )}
      {/* ปาก */}
      {eating ? (
        <ellipse className="animate-chomp" cx="100" cy="116" rx="10" ry="8" fill="#7a2e2e" />
      ) : sad ? (
        <path d="M90 120 q10 -8 20 0" stroke="#3b2f2f" strokeWidth="4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M88 112 q12 12 24 0" stroke="#3b2f2f" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {sleepy && (
        <text x="150" y="60" fontSize="22" fill="#6b7280" fontWeight="bold">
          z<tspan fontSize="16" dy="-8">z</tspan>
        </text>
      )}
    </svg>
  );
}
