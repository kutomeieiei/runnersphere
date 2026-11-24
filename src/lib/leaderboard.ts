/** การจัดอันดับกระดานรายสัปดาห์ (pure — ใช้ฝั่ง server และ test) */

export type LeaderboardEntry = {
  id: string;
  nickname: string;
  spots: number;
  distanceM: number;
  /** เวลาที่ทำจุดล่าสุด — ถ้าคะแนนเท่ากัน คนที่ทำได้ก่อนอยู่สูงกว่า */
  updatedAt: number;
};

export type RankedEntry = LeaderboardEntry & { rank: number };

/** เรียงตาม จุด (มาก→น้อย) → ระยะทาง (มาก→น้อย) → เวลา (ก่อน→หลัง) */
export function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.spots - a.spots || b.distanceM - a.distanceM || a.updatedAt - b.updatedAt;
}

/**
 * ให้อันดับแบบ "จุดเท่ากัน = อันดับเท่ากัน" (1, 2, 2, 4)
 * อันดับคิดจากจำนวนจุดอย่างเดียว เพื่อให้ตรงกับอันดับของตัวเองที่นับจาก count()
 */
export function rankEntries(entries: LeaderboardEntry[]): RankedEntry[] {
  const sorted = entries.filter((e) => e.spots > 0).sort(compareEntries);
  let rank = 0;
  let prevSpots = Number.NaN;
  return sorted.map((e, i) => {
    if (e.spots !== prevSpots) {
      rank = i + 1;
      prevSpots = e.spots;
    }
    return { ...e, rank };
  });
}

/** ตรวจคำไม่สุภาพในชื่อเล่น (ไม่สนตัวพิมพ์เล็กใหญ่ ช่องว่าง และจุด) */
export function containsBlockedWord(nickname: string, blocked: readonly string[]): boolean {
  const normalized = nickname.toLowerCase().replace(/[\s._\-*]/g, "");
  return blocked.some((w) => w && normalized.includes(w.toLowerCase()));
}
