import { parseReading } from "@/lib/arrival";
import { requireUser } from "@/lib/server/auth";
import { checkMission } from "@/lib/server/game-service";
import { ApiError, json, readJson, route } from "@/lib/server/http";

/** client ส่งแค่ตำแหน่ง + accuracy + timestamp — การตัดสินทั้งหมดทำที่ server */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const reading = parseReading(await readJson(req));
  if (!reading) throw new ApiError(400, "invalid_input");
  return json(await checkMission(user.uid, reading));
});
