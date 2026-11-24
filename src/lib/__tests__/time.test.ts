import { describe, expect, it } from "vitest";
import { dateKey, isWithinPlayHours, lastNDateKeys } from "../time";

// 2026-11-24 17:30 UTC = 2026-11-25 00:30 in Bangkok (UTC+7)
const t = Date.UTC(2026, 10, 24, 17, 30);

describe("time", () => {
  it("uses Bangkok time for the date key", () => {
    expect(dateKey(t, "Asia/Bangkok")).toBe("2026-11-25");
    expect(dateKey(t, "UTC")).toBe("2026-11-24");
  });

  it("lists the last N days, oldest first", () => {
    const keys = lastNDateKeys(t, 7, "Asia/Bangkok");
    expect(keys).toHaveLength(7);
    expect(keys[6]).toBe("2026-11-25");
    expect(keys[0]).toBe("2026-11-19");
  });

  it("play hours disabled → always allowed", () => {
    expect(isWithinPlayHours(t, { enabled: false, start: "07:00", end: "18:00" })).toBe(true);
  });

  it("play hours enabled", () => {
    const cfg = { enabled: true, start: "07:00", end: "18:00" };
    expect(isWithinPlayHours(t, cfg, "Asia/Bangkok")).toBe(false); // 00:30
    expect(isWithinPlayHours(Date.UTC(2026, 10, 24, 3, 0), cfg, "Asia/Bangkok")).toBe(true); // 10:00
  });

  it("supports ranges across midnight", () => {
    const cfg = { enabled: true, start: "20:00", end: "06:00" };
    expect(isWithinPlayHours(t, cfg, "Asia/Bangkok")).toBe(true);
  });
});
