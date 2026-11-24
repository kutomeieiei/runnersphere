import { requireUser } from "@/lib/server/auth";
import { setActivePet } from "@/lib/server/game-service";
import { json, readJson, route } from "@/lib/server/http";

/** body: { speciesId } — สลับตัวที่ออกเดินด้วย หรือรับเลี้ยงชนิดที่ปลดล็อกแล้ว */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const body = (await readJson(req)) as { speciesId?: unknown };
  return json(await setActivePet(user.uid, body?.speciesId));
});
