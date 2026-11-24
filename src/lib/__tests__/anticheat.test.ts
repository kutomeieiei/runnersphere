import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "@/config/game";
import { checkSpeed, rateLimitWaitMs, validateTimestamp } from "../anticheat";
import { offsetM } from "../geo";

const cfg = GAME_CONFIG.antiCheat;
const now = 1_800_000_000_000;

describe("validateTimestamp", () => {
  it("accepts a fresh timestamp", () => {
    expect(validateTimestamp(now - 1000, now, null)).toBe("ok");
  });
  it("rejects invalid values", () => {
    expect(validateTimestamp("x", now, null)).toBe("invalid");
    expect(validateTimestamp(NaN, now, null)).toBe("invalid");
    expect(validateTimestamp(-1, now, null)).toBe("invalid");
  });
  it("rejects timestamps too far in the future", () => {
    expect(validateTimestamp(now + cfg.maxClockSkewMs + 1, now, null)).toBe("in_future");
    expect(validateTimestamp(now + cfg.maxClockSkewMs - 1, now, null)).toBe("ok");
  });
  it("rejects stale positions", () => {
    expect(
      validateTimestamp(now - cfg.maxPositionAgeMs - cfg.maxClockSkewMs - 1, now, null),
    ).toBe("too_old");
  });
  it("rejects replayed / non-increasing timestamps", () => {
    expect(validateTimestamp(now - 1000, now, now - 1000)).toBe("not_monotonic");
    expect(validateTimestamp(now - 2000, now, now - 1000)).toBe("not_monotonic");
    expect(validateTimestamp(now - 500, now, now - 1000)).toBe("ok");
  });
});

describe("checkSpeed", () => {
  const a = { lat: 16.4745, lng: 102.826 };
  const sample = (p: { lat: number; lng: number }, t: number, acc = 10) => ({
    ...p,
    accuracy: acc,
    timestamp: t,
    serverAt: t,
  });

  it("walking speed is fine", () => {
    const b = offsetM(a, 90, 14); // 14 m in 10 s = 1.4 m/s
    const v = checkSpeed(sample(a, now), sample(b, now + 10_000));
    expect(v.suspicious).toBe(false);
  });

  it("flags teleporting 300 m in 5 s", () => {
    const b = offsetM(a, 90, 300);
    const v = checkSpeed(sample(a, now), sample(b, now + 5_000));
    expect(v.suspicious).toBe(true);
    expect(v.speedMps).toBeGreaterThan(cfg.maxSpeedMps);
  });

  it("tolerates GPS jitter within accuracy", () => {
    const b = offsetM(a, 90, 40); // jump 40 m in 2 s but accuracy 25 m each
    const v = checkSpeed(sample(a, now, 25), sample(b, now + 2_000, 25));
    expect(v.suspicious).toBe(false);
  });

  it("cannot be fooled by inflating client timestamps", () => {
    const b = offsetM(a, 90, 300);
    const prev = { ...a, accuracy: 10, timestamp: now - 600_000, serverAt: now };
    const cur = { ...b, accuracy: 10, timestamp: now + 5_000, serverAt: now + 5_000 };
    expect(checkSpeed(prev, cur).suspicious).toBe(true);
  });
});

describe("rateLimitWaitMs", () => {
  it("passes when no previous request", () => {
    expect(rateLimitWaitMs(null, now, 2000)).toBe(0);
  });
  it("returns remaining wait time", () => {
    expect(rateLimitWaitMs(now - 500, now, 2000)).toBe(1500);
    expect(rateLimitWaitMs(now - 2000, now, 2000)).toBe(0);
  });
});
