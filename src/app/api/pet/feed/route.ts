import { requireUser } from "@/lib/server/auth";
import { feed } from "@/lib/server/game-service";
import { json, readJson, route } from "@/lib/server/http";

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const body = (await readJson(req)) as { foodId?: unknown };
  return json(await feed(user.uid, body?.foodId));
});
