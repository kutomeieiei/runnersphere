import { pointInPolygon } from "@/lib/geo";
import { areaById, validatePolygon, validateSpotInput } from "@/lib/areas";
import { requireMapEditor } from "@/lib/server/auth";
import {
  addCustomSpot,
  deleteCustomSpot,
  loadEffectiveAreas,
  resetAreaPolygon,
  saveAreaPolygon,
} from "@/lib/server/areas-store";
import { ApiError, json, readJson, route } from "@/lib/server/http";

/**
 * เครื่องมือแก้แผนที่ (ชั่วคราวช่วงทดสอบ)
 * body.action:
 *  - "setPolygon"   { areaId, polygon: [{lat,lng}, …] }   วาดกรอบพื้นที่ใหม่
 *  - "resetPolygon" { areaId }                            กลับไปใช้กรอบใน config
 *  - "addSpot"      { areaId, name, lat, lng, difficulty } ปักจุดภารกิจ (ต้องอยู่ในกรอบ)
 *  - "deleteSpot"   { id }                                ลบจุดที่ปักเอง
 */
export const POST = route(async (req) => {
  const user = await requireMapEditor(req);
  const body = (await readJson(req)) as Record<string, unknown>;
  const action = body?.action;

  if (action === "deleteSpot") {
    const ok = typeof body.id === "string" && (await deleteCustomSpot(body.id));
    if (!ok) throw new ApiError(404, "invalid_input");
    return json({ ok: true });
  }

  const areaId = typeof body?.areaId === "string" ? body.areaId : "";
  if (!areaById(areaId)) throw new ApiError(400, "invalid_area");

  if (action === "setPolygon") {
    const polygon = validatePolygon(body.polygon);
    if (!polygon) throw new ApiError(400, "invalid_area");
    await saveAreaPolygon(areaId, polygon, user.uid);
    return json({ ok: true });
  }

  if (action === "resetPolygon") {
    await resetAreaPolygon(areaId);
    return json({ ok: true });
  }

  if (action === "addSpot") {
    const input = validateSpotInput(body);
    if (!input) throw new ApiError(400, "invalid_input");
    const area = (await loadEffectiveAreas()).find((a) => a.id === areaId);
    if (!area || !pointInPolygon(input.position, area.polygon)) throw new ApiError(400, "spot_outside_area");
    const id = await addCustomSpot(areaId, input, user.uid);
    return json({ ok: true, id });
  }

  throw new ApiError(400, "invalid_input");
});
