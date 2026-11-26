import { GAME_CONFIG } from "@/config/game";
import { db, normalizePrivateKey } from "@/lib/server/firebase-admin";
import { ApiError, classifyServerError, json } from "@/lib/server/http";
import { messageFor } from "@/lib/errors";

/**
 * ตรวจการตั้งค่าระบบ (สำหรับผู้ดูแล) — เปิด https://<โดเมน>/api/health ในเบราว์เซอร์
 * บอกแค่ว่าตั้งค่าครบหรือไม่ และฐานข้อมูลตอบหรือไม่ ไม่ส่งค่าของรหัสลับใดๆ กลับไป
 */
export async function GET() {
  const has = (name: string) => Boolean(process.env[name]?.trim());
  const env = {
    NEXT_PUBLIC_FIREBASE_API_KEY: has("NEXT_PUBLIC_FIREBASE_API_KEY"),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: has("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: has("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    NEXT_PUBLIC_FIREBASE_APP_ID: has("NEXT_PUBLIC_FIREBASE_APP_ID"),
    FIREBASE_PROJECT_ID: has("FIREBASE_PROJECT_ID"),
    FIREBASE_CLIENT_EMAIL: has("FIREBASE_CLIENT_EMAIL"),
    FIREBASE_PRIVATE_KEY: has("FIREBASE_PRIVATE_KEY"),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: has("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
  };
  const usingEmulator = has("FIRESTORE_EMULATOR_HOST") || has("FIREBASE_AUTH_EMULATOR_HOST");
  const optional = new Set([
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    // ตอนทดสอบกับ Firebase Emulator ไม่ต้องใช้กุญแจของ server
    ...(usingEmulator ? ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"] : []),
  ]);
  const missing = Object.entries(env)
    .filter(([k, v]) => !v && !optional.has(k))
    .map(([k]) => k);

  const projectsMatch =
    !env.FIREBASE_PROJECT_ID ||
    !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID === process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const key = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY) ?? "";
  const privateKeyLooksValid = !env.FIREBASE_PRIVATE_KEY || /-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(key);

  let firestore: { ok: boolean; ms?: number; problem?: string; hint?: string } = { ok: false };
  const started = Date.now();
  try {
    await db().collection("_health").doc("ping").get();
    firestore = { ok: true, ms: Date.now() - started };
  } catch (err) {
    const code = err instanceof ApiError ? err.code : classifyServerError(err);
    firestore = { ok: false, ms: Date.now() - started, problem: code, hint: messageFor(code) };
    console.error("[health] firestore check failed", err);
  }

  const ok = missing.length === 0 && projectsMatch && privateKeyLooksValid && firestore.ok;
  return json(
    {
      ok,
      app: "Movemai",
      serverRegion: process.env.VERCEL_REGION ?? "local",
      usingEmulator,
      missingEnv: missing,
      projectIdsMatch: projectsMatch,
      privateKeyLooksValid,
      firestore,
      emailVerificationRequired: GAME_CONFIG.features.requireEmailVerification,
      googleMapsKeySet: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    ok ? 200 : 503,
  );
}
