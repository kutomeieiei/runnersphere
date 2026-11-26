import { describe, expect, it } from "vitest";
import { PLAY_AREAS } from "@/config/game";
import { ACTIVE_AREAS, DEFAULT_AREA, allSpots, areaById, areaCenter, areasByDistance, distanceToArea, findAreaAt } from "../areas";
import { offsetM, pointInPolygon } from "../geo";

describe("play areas", () => {
  it("has at least one active area and a default", () => {
    expect(ACTIVE_AREAS.length).toBeGreaterThan(0);
    expect(DEFAULT_AREA.id).toBe(ACTIVE_AREAS[0].id);
  });

  it("finds the area a point is inside", () => {
    for (const a of ACTIVE_AREAS) {
      expect(findAreaAt(areaCenter(a))?.id).toBe(a.id);
    }
    expect(findAreaAt({ lat: 13.75, lng: 100.5 })).toBeNull();
  });

  it("sorts areas by distance and reports 0 inside", () => {
    const a = ACTIVE_AREAS[0];
    const list = areasByDistance(areaCenter(a));
    expect(list[0].area.id).toBe(a.id);
    expect(list[0].distanceM).toBe(0);
    const far = offsetM(areaCenter(a), 0, 50_000);
    expect(distanceToArea(far, a)).toBeGreaterThan(40_000);
  });

  it("looks up areas by id", () => {
    expect(areaById(DEFAULT_AREA.id)?.name).toBe(DEFAULT_AREA.name);
    expect(areaById("nope")).toBeUndefined();
  });
});

describe("play area config sanity", () => {
  it("area ids are unique and polygons have at least 3 points", () => {
    expect(new Set(PLAY_AREAS.map((a) => a.id)).size).toBe(PLAY_AREAS.length);
    for (const a of PLAY_AREAS) expect(a.polygon.length, a.id).toBeGreaterThanOrEqual(3);
  });

  it("every spot is inside its own area", () => {
    for (const a of PLAY_AREAS) {
      for (const s of a.spots) {
        expect(pointInPolygon(s.position, a.polygon), `${s.id} อยู่นอกพื้นที่ ${a.id}`).toBe(true);
      }
    }
  });

  it("spot ids are unique across all areas", () => {
    const ids = allSpots().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each area has at least 2 enabled spots so the next spot can differ", () => {
    for (const a of ACTIVE_AREAS) {
      expect(a.spots.filter((s) => s.enabled !== false).length, a.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("areas do not overlap (a spot never belongs to two areas)", () => {
    for (const s of allSpots()) {
      const owners = PLAY_AREAS.filter((a) => pointInPolygon(s.position, a.polygon)).map((a) => a.id);
      expect(owners, s.id).toEqual([s.areaId]);
    }
  });
});
