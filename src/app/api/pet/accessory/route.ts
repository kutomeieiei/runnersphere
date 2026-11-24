import { requireUser } from "@/lib/server/auth";
import { accessoryAction } from "@/lib/server/game-service";
import { json, readJson, route } from "@/lib/server/http";

/** body: { action: "buy" | "equip", accessoryId } หรือ { action: "unequip", slot } */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const body = (await readJson(req)) as Record<string, unknown>;
  return json(await accessoryAction(user.uid, body ?? {}));
});
