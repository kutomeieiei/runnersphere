import { requireUser } from "@/lib/server/auth";
import { upsertProfile } from "@/lib/server/game-service";
import { json, readJson, route } from "@/lib/server/http";

/** สร้างโปรไฟล์ครั้งแรก (หลังสมัคร) หรือเปลี่ยนชื่อเล่น */
export const POST = route(async (req) => {
  // อนุญาตแม้ยังไม่ยืนยันอีเมล เพื่อให้สร้างโปรไฟล์ได้ทันทีหลังสมัคร
  const user = await requireUser(req, { allowUnverified: true, checkRevoked: true });
  const body = (await readJson(req)) as { nickname?: unknown };
  const result = await upsertProfile(user.uid, body?.nickname);
  return json(result, result.created ? 201 : 200);
});
