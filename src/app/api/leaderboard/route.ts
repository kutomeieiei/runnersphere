import { requireUser } from "@/lib/server/auth";
import { getLeaderboard } from "@/lib/server/game-service";
import { json, route } from "@/lib/server/http";

/** กระดานอันดับรายสัปดาห์ (ส่งเฉพาะชื่อเล่นและตัวเลข ไม่มี uid ของคนอื่น) */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json(await getLeaderboard(user.uid));
});
