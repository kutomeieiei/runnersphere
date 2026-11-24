import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "@/config/game";
import { compareEntries, containsBlockedWord, rankEntries, type LeaderboardEntry } from "../leaderboard";
import { weekDateKeysSoFar, weekdayIndex, weekEndKey, weekStartKey } from "../time";

const e = (id: string, spots: number, distanceM = 0, updatedAt = 0): LeaderboardEntry => ({
  id,
  nickname: id,
  spots,
  distanceM,
  updatedAt,
});

describe("rankEntries", () => {
  it("sorts by spots, then distance, then who got there first", () => {
    const ranked = rankEntries([e("a", 3, 100, 5), e("b", 5), e("c", 3, 300, 9), e("d", 3, 100, 1)]);
    expect(ranked.map((r) => r.id)).toEqual(["b", "c", "d", "a"]);
  });

  it("gives equal spots the same rank (1, 2, 2, 4)", () => {
    const ranked = rankEntries([e("a", 9), e("b", 7, 500), e("c", 7, 100), e("d", 2)]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("drops players with zero spots", () => {
    expect(rankEntries([e("a", 0), e("b", 1)]).map((r) => r.id)).toEqual(["b"]);
  });

  it("compareEntries is consistent", () => {
    expect(compareEntries(e("a", 2), e("b", 1))).toBeLessThan(0);
    expect(compareEntries(e("a", 1, 50), e("b", 1, 10))).toBeLessThan(0);
  });
});

describe("containsBlockedWord", () => {
  const blocked = GAME_CONFIG.profile.blockedWords;
  it("blocks rude nicknames even with spacing or case tricks", () => {
    expect(containsBlockedWord("FuCk", blocked)).toBe(true);
    expect(containsBlockedWord("f u c k", blocked)).toBe(true);
    expect(containsBlockedWord("s.h.i.t", blocked)).toBe(true);
    expect(containsBlockedWord("ไอ้สัส", blocked)).toBe(true);
  });
  it("allows normal nicknames", () => {
    for (const n of ["ต้นกล้า", "Mew", "น้องฝ้าย", "Runner 07"]) {
      expect(containsBlockedWord(n, blocked)).toBe(false);
    }
  });
});

describe("week helpers (Asia/Bangkok, Monday start)", () => {
  // 2026-11-24 is a Tuesday. 17:30 UTC = Wednesday 00:30 in Bangkok.
  const tueNoonBkk = Date.UTC(2026, 10, 24, 5, 0);
  const wedEarlyBkk = Date.UTC(2026, 10, 24, 17, 30);
  const sunLateBkk = Date.UTC(2026, 10, 29, 16, 59); // Sun 23:59
  const monEarlyBkk = Date.UTC(2026, 10, 29, 17, 1); // Mon 00:01

  it("finds the weekday in Bangkok time", () => {
    expect(weekdayIndex(tueNoonBkk, "Asia/Bangkok")).toBe(1);
    expect(weekdayIndex(wedEarlyBkk, "Asia/Bangkok")).toBe(2);
  });

  it("weeks start on Monday and end on Sunday", () => {
    expect(weekStartKey(tueNoonBkk, "Asia/Bangkok")).toBe("2026-11-23");
    expect(weekEndKey(tueNoonBkk, "Asia/Bangkok")).toBe("2026-11-29");
    expect(weekStartKey(sunLateBkk, "Asia/Bangkok")).toBe("2026-11-23");
  });

  it("a new week starts at Monday midnight Bangkok time", () => {
    expect(weekStartKey(monEarlyBkk, "Asia/Bangkok")).toBe("2026-11-30");
    expect(weekDateKeysSoFar(monEarlyBkk, "Asia/Bangkok")).toEqual(["2026-11-30"]);
  });

  it("lists the days so far this week", () => {
    expect(weekDateKeysSoFar(wedEarlyBkk, "Asia/Bangkok")).toEqual(["2026-11-23", "2026-11-24", "2026-11-25"]);
  });
});
