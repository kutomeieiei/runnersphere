import { requireUser } from "@/lib/server/auth";
import { getStats } from "@/lib/server/game-service";
import { json, route } from "@/lib/server/http";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json(await getStats(user.uid));
});
