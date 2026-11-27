import { GAME_CONFIG } from "@/config/game";
import { canEditMap, requireUser } from "@/lib/server/auth";
import { loadEffectiveAreas } from "@/lib/server/areas-store";
import { json, route } from "@/lib/server/http";

/** พื้นที่เล่นที่ใช้จริง (config + การแก้จากเครื่องมือแก้แผนที่) และสิทธิ์แก้ของผู้ใช้คนนี้ */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  const areas = await loadEffectiveAreas();
  return json({
    areas,
    editor: { enabled: GAME_CONFIG.features.mapEditor, canEdit: canEditMap(user) },
  });
});
