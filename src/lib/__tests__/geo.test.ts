import { describe, expect, it } from "vitest";
import {
  bearingDeg,
  bearingToThai,
  boundsOf,
  haversineM,
  isValidLatLng,
  moveTowards,
  offsetM,
  pointInPolygon,
} from "../geo";

const square = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 1, lng: 1 },
  { lat: 1, lng: 0 },
];

describe("haversineM", () => {
  it("returns 0 for the same point", () => {
    expect(haversineM({ lat: 16.47, lng: 102.82 }, { lat: 16.47, lng: 102.82 })).toBe(0);
  });

  it("1 degree of latitude ≈ 111.2 km", () => {
    const d = haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it("matches a known distance (Bangkok → Khon Kaen ≈ 385 km straight line)", () => {
    const d = haversineM({ lat: 13.7563, lng: 100.5018 }, { lat: 16.4419, lng: 102.836 });
    expect(d / 1000).toBeGreaterThan(370);
    expect(d / 1000).toBeLessThan(400);
  });

  it("is symmetric", () => {
    const a = { lat: 16.4745, lng: 102.826 };
    const b = { lat: 16.4755, lng: 102.8248 };
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 6);
  });

  it("is accurate for short school-scale distances", () => {
    const a = { lat: 16.4745, lng: 102.826 };
    const b = offsetM(a, 90, 100);
    expect(haversineM(a, b)).toBeCloseTo(100, 0);
  });
});

describe("bearingDeg", () => {
  const o = { lat: 16.47, lng: 102.82 };
  it.each([
    [0, "ทิศเหนือ"],
    [90, "ทิศตะวันออก"],
    [180, "ทิศใต้"],
    [270, "ทิศตะวันตก"],
    [45, "ทิศตะวันออกเฉียงเหนือ"],
  ])("bearing %d° → %s", (deg, thai) => {
    const target = offsetM(o, deg, 200);
    const b = bearingDeg(o, target);
    expect(Math.abs(((b - deg + 540) % 360) - 180)).toBeLessThan(0.5);
    expect(bearingToThai(b)).toBe(thai);
  });

  it("bearingToThai handles wrap-around and negatives", () => {
    expect(bearingToThai(359)).toBe("ทิศเหนือ");
    expect(bearingToThai(-90)).toBe("ทิศตะวันตก");
    expect(bearingToThai(720 + 180)).toBe("ทิศใต้");
  });
});

describe("pointInPolygon", () => {
  it("detects inside / outside of a square", () => {
    expect(pointInPolygon({ lat: 0.5, lng: 0.5 }, square)).toBe(true);
    expect(pointInPolygon({ lat: 1.5, lng: 0.5 }, square)).toBe(false);
    expect(pointInPolygon({ lat: 0.5, lng: -0.1 }, square)).toBe(false);
  });

  it("handles concave (L-shaped) polygons", () => {
    const L = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 1, lng: 2 },
      { lat: 1, lng: 1 },
      { lat: 2, lng: 1 },
      { lat: 2, lng: 0 },
    ];
    expect(pointInPolygon({ lat: 0.5, lng: 1.5 }, L)).toBe(true);
    expect(pointInPolygon({ lat: 1.5, lng: 0.5 }, L)).toBe(true);
    expect(pointInPolygon({ lat: 1.5, lng: 1.5 }, L)).toBe(false); // the notch
  });

  it("returns false for degenerate polygons", () => {
    expect(pointInPolygon({ lat: 0, lng: 0 }, square.slice(0, 2))).toBe(false);
  });

  it("works regardless of winding order", () => {
    expect(pointInPolygon({ lat: 0.5, lng: 0.5 }, [...square].reverse())).toBe(true);
  });
});

describe("helpers", () => {
  it("boundsOf adds padding in metres", () => {
    const b = boundsOf(square, 0);
    expect(b).toEqual({ north: 1, south: 0, east: 1, west: 0 });
    const p = boundsOf(square, 1113.2);
    expect(p.north).toBeCloseTo(1.01, 4);
    expect(p.south).toBeCloseTo(-0.01, 4);
  });

  it("moveTowards moves the requested distance and never overshoots", () => {
    const a = { lat: 16.4745, lng: 102.826 };
    const b = offsetM(a, 30, 100);
    const m = moveTowards(a, b, 40);
    expect(haversineM(a, m)).toBeCloseTo(40, 0);
    expect(moveTowards(a, b, 500)).toEqual(b);
  });

  it("isValidLatLng validates ranges", () => {
    expect(isValidLatLng({ lat: 16, lng: 102 })).toBe(true);
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: "16", lng: 102 })).toBe(false);
    expect(isValidLatLng(null)).toBe(false);
    expect(isValidLatLng({ lat: NaN, lng: 0 })).toBe(false);
  });
});
