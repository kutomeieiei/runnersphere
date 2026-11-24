import { describe, expect, it } from "vitest";
import type { Spot } from "@/config/game";
import { GAME_CONFIG } from "@/config/game";
import { offsetM } from "../geo";
import { calcCoins, minTravelMs, selectSpot } from "../missions";

const origin = { lat: 16.4745, lng: 102.826 };
const fence = [
  offsetM(offsetM(origin, 0, 600), 270, 600),
  offsetM(offsetM(origin, 0, 600), 90, 600),
  offsetM(offsetM(origin, 180, 600), 90, 600),
  offsetM(offsetM(origin, 180, 600), 270, 600),
];

const spot = (id: string, bearing: number, meters: number, extra: Partial<Spot> = {}): Spot => ({
  id,
  name: id,
  position: offsetM(origin, bearing, meters),
  difficulty: 1,
  ...extra,
});

describe("selectSpot", () => {
  const spots: Spot[] = [
    spot("too-close", 0, 20),
    spot("near", 90, 120),
    spot("mid", 180, 250),
    spot("far", 270, 450),
    spot("outside", 0, 2000),
    spot("disabled", 45, 150, { enabled: false }),
  ];

  it("only picks spots within [min, max], enabled and inside the geofence", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const r = selectSpot({ spots, player: origin, geofence: fence, rng: () => i / 50 });
      expect(r).not.toBeNull();
      seen.add(r!.spot.id);
    }
    expect([...seen].sort()).toEqual(["mid", "near"]);
  });

  it("never repeats the previous spot", () => {
    for (let i = 0; i < 20; i++) {
      const r = selectSpot({
        spots,
        player: origin,
        geofence: fence,
        lastSpotId: "near",
        rng: () => i / 20,
      });
      expect(r!.spot.id).toBe("mid");
    }
  });

  it("falls back to nearest spots beyond min when nothing is in range", () => {
    const r = selectSpot({
      spots: [spot("a", 0, 20), spot("b", 90, 450), spot("c", 180, 500)],
      player: origin,
      geofence: fence,
      rng: () => 0,
    });
    expect(r!.spot.id).toBe("b");
    expect(r!.distanceM).toBeGreaterThan(GAME_CONFIG.start.maxSpotDistanceM);
  });

  it("returns null when no spot qualifies", () => {
    expect(
      selectSpot({ spots: [spot("a", 0, 10)], player: origin, geofence: fence }),
    ).toBeNull();
    expect(selectSpot({ spots: [], player: origin, geofence: fence })).toBeNull();
  });

  it("reports the distance to the chosen spot", () => {
    const r = selectSpot({ spots: [spot("x", 90, 200)], player: origin, geofence: fence });
    expect(r!.distanceM).toBeCloseTo(200, 0);
  });
});

describe("calcCoins", () => {
  const cfg = GAME_CONFIG.coins;
  it("grows with distance and difficulty", () => {
    expect(calcCoins(0, 1)).toBe(cfg.base);
    expect(calcCoins(100, 1)).toBe(cfg.base + 4);
    expect(calcCoins(100, 3)).toBe(cfg.base + 4 + cfg.difficultyBonus[3]);
    expect(calcCoins(200, 1)).toBeGreaterThan(calcCoins(100, 1));
  });

  it("is capped", () => {
    expect(calcCoins(100_000, 3)).toBe(cfg.maxPerMission);
  });

  it("handles negative input safely", () => {
    expect(calcCoins(-50, 1)).toBe(cfg.base);
  });
});

describe("minTravelMs", () => {
  it("is zero when already close", () => {
    expect(minTravelMs(30)).toBe(0);
  });
  it("scales with distance", () => {
    // (300 - 28 - 40) / 7 m/s ≈ 33.1 s
    expect(minTravelMs(300, 28, 7, 40)).toBe(Math.round((232 / 7) * 1000));
  });
});
