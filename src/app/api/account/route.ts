import { requireUser } from "@/lib/server/auth";
import { deleteAccount } from "@/lib/server/game-service";
import { json, route } from "@/lib/server/http";

/** ลบบัญชีและข้อมูลทั้งหมดของผู้ใช้ */
export const DELETE = route(async (req) => {
  const user = await requireUser(req, { allowUnverified: true });
  await deleteAccount(user.uid);
  return json({ deleted: true });
});
