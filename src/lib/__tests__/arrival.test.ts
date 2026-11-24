import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "@/config/game";
import { classifyAccuracy, parseReading, processCheck, type MissionCheckState } from "../arrival";
import { offsetM } from "../geo";

const target = { lat: 16.4745, lng: 102.826 };
const t0 = 1_800_000_000_000;
const { radiusM, requiredConsecutive, minCheckIntervalMs, maxAccuracyM } = GAME_CONFIG.arrival;

function mission(overrides: Partial<MissionCheckState> = {}): MissionCheckState {
  const start = offsetM(target, 270, 150);
  return {
    target,
    radiusM,
    expiresAt: t0 + 30 * 60_000,
    minCompletionAt: t0,
    consecutive: 0,
    flags: 0,
    lastCheck: { ...start, accuracy: 10, timestamp: t0 - 120_000, serverAt: t0 - 120_000 },
    lastCheckServerAt: t0 - 120_000,
    ...overrides,
  };
}

const at = (p: { lat: number; lng: number }, t: number, accuracy = 8) => ({ ...p, accuracy, timestamp: t });

/** apply the patch like the server would */
function apply(m: MissionCheckState, patch: Partial<MissionCheckState> | null) {
  return patch ? { ...m, ...patch } : m;
}

describe("classifyAccuracy", () => {
  it("classifies accuracy levels", () => {
    expect(classifyAccuracy(5)).toBe("good");
    expect(classifyAccuracy(maxAccuracyM)).toBe("good");
    expect(classifyAccuracy(maxAccuracyM + 1)).toBe("poor");
    expect(classifyAccuracy(1500)).toBe("approximate");
    expect(classifyAccuracy(NaN)).toBe("approximate");
  });
});

describe("processCheck", () => {
  it(`requires ${requiredConsecutive} consecutive in-radius readings`, () => {
    let m = mission();
    const inside = offsetM(target, 0, 10);
    for (let i = 1; i <= requiredConsecutive; i++) {
      const now = t0 + i * 3000;
      const r = processCheck(m, at(inside, now - 200), now);
      if (i < requiredConsecutive) {
        expect(r.outcome).toBe("counting");
        expect(r.consecutive).toBe(i);
      } else {
        expect(r.outcome).toBe("arrived");
      }
      m = apply(m, r.patch);
    }
  });

  it("resets the counter when leaving the radius", () => {
    let m = mission();
    const inside = offsetM(target, 0, 10);
    const outside = offsetM(target, 0, radiusM + 15);
    m = apply(m, processCheck(m, at(inside, t0 + 2800), t0 + 3000).patch);
    expect(m.consecutive).toBe(1);
    const r = processCheck(m, at(outside, t0 + 5800), t0 + 6000);
    expect(r.outcome).toBe("not_arrived");
    expect(r.consecutive).toBe(0);
  });

  it("does not count readings with poor accuracy and resets the counter", () => {
    let m = mission({ consecutive: 2 });
    const inside = offsetM(target, 0, 5);
    const r = processCheck(m, at(inside, t0 + 2800, maxAccuracyM + 10), t0 + 3000);
    expect(r.outcome).toBe("poor_accuracy");
    m = apply(m, r.patch);
    expect(m.consecutive).toBe(0);
    // poor readings are not used as the speed baseline
    expect(m.lastCheck?.timestamp).toBe(t0 - 120_000);
  });

  it("rate limits requests that are too frequent", () => {
    const m = mission({ lastCheckServerAt: t0 - 500 });
    const r = processCheck(m, at(target, t0), t0);
    expect(r.outcome).toBe("rate_limited");
    expect(r.retryAfterMs).toBe(minCheckIntervalMs - 500);
    expect(r.patch).toBeNull();
  });

  it("rejects stale / replayed timestamps", () => {
    const m = mission();
    expect(processCheck(m, at(target, t0 - 10 * 60_000), t0).outcome).toBe("invalid_timestamp");
    expect(processCheck(m, at(target, t0 - 120_000), t0).outcome).toBe("invalid_timestamp");
  });

  it("flags teleporting and keeps the old baseline", () => {
    const far = offsetM(target, 270, 2000);
    let m = mission({
      lastCheck: { ...far, accuracy: 5, timestamp: t0 - 3000, serverAt: t0 - 3000 },
      lastCheckServerAt: t0 - 3000,
    });
    const r = processCheck(m, at(target, t0 - 100), t0);
    expect(r.outcome).toBe("too_fast");
    m = apply(m, r.patch);
    expect(m.flags).toBe(1);
    expect(m.lastCheck?.lat).toBeCloseTo(far.lat, 8);
  });

  it("marks the mission flagged after too many suspicious readings", () => {
    const far = offsetM(target, 270, 5000);
    const m = mission({
      flags: GAME_CONFIG.antiCheat.maxFlagsPerMission - 1,
      lastCheck: { ...far, accuracy: 5, timestamp: t0 - 3000, serverAt: t0 - 3000 },
      lastCheckServerAt: t0 - 3000,
    });
    expect(processCheck(m, at(target, t0 - 100), t0).outcome).toBe("flagged");
  });

  it("does not complete before the minimum travel time", () => {
    let m = mission({ minCompletionAt: t0 + 60_000, consecutive: requiredConsecutive - 1 });
    const r = processCheck(m, at(target, t0 - 100), t0);
    expect(r.outcome).toBe("counting");
    m = apply(m, r.patch);
    expect(m.consecutive).toBe(requiredConsecutive - 1);
    const later = processCheck(m, at(target, t0 + 60_000), t0 + 60_100);
    expect(later.outcome).toBe("arrived");
  });

  it("expires old missions", () => {
    const m = mission({ expiresAt: t0 - 1 });
    expect(processCheck(m, at(target, t0), t0).outcome).toBe("expired");
  });
});

describe("parseReading", () => {
  it("accepts a valid body", () => {
    expect(parseReading({ lat: 16, lng: 102, accuracy: 5, timestamp: 1 })).toEqual({
      lat: 16,
      lng: 102,
      accuracy: 5,
      timestamp: 1,
    });
  });
  it("rejects bad bodies", () => {
    expect(parseReading(null)).toBeNull();
    expect(parseReading({ lat: "16", lng: 102, accuracy: 5, timestamp: 1 })).toBeNull();
    expect(parseReading({ lat: 16, lng: 102, accuracy: -1, timestamp: 1 })).toBeNull();
    expect(parseReading({ lat: 100, lng: 102, accuracy: 1, timestamp: 1 })).toBeNull();
    expect(parseReading({ lat: 16, lng: 102, accuracy: Infinity, timestamp: 1 })).toBeNull();
  });
});
