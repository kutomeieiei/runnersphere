import { requireUser } from "@/lib/server/auth";
import { setLeaderboardVisible } from "@/lib/server/game-service";
import { json, readJson, route } from "@/lib/server/http";

/** เปิด/ปิดการแสดงชื่อในกระดานอันดับ */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const body = (await readJson(req)) as { visible?: unknown };
  return json(await setLeaderboardVisible(user.uid, body?.visible));
});
