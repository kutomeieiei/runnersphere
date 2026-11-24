import { requireUser } from "@/lib/server/auth";
import { cancelMission } from "@/lib/server/game-service";
import { json, route } from "@/lib/server/http";

export const POST = route(async (req) => {
  const user = await requireUser(req);
  return json(await cancelMission(user.uid));
});
