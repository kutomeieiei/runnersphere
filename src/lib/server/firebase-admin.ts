import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { ApiError } from "./http";
import { normalizePrivateKey } from "./private-key";

export { normalizePrivateKey };

/**
 * Firebase Admin SDK (ใช้เฉพาะฝั่ง server)
 * อ่าน credential จาก environment variables — ห้าม commit ลง repo
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * ถ้าใช้ Firebase Emulator (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST)
 * ต้องการแค่ project id
 */
function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const usingEmulator = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST,
  );

  if (usingEmulator) {
    if (!projectId) throw new ApiError(500, "server_misconfigured");
    return initializeApp({ projectId });
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) {
    throw new ApiError(500, "server_misconfigured");
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

export function adminAuth() {
  return getAuth(adminApp());
}

let dbInstance: FirebaseFirestore.Firestore | null = null;
export function db() {
  if (!dbInstance) {
    dbInstance = getFirestore(adminApp());
    // preferRest: ใช้ HTTP แทน gRPC — เริ่มทำงานเร็วกว่ามากบน serverless (Vercel) ตอน cold start
    // (ปิดเมื่อใช้ Firestore Emulator เพราะโหมด REST ต้องการ credential จริง)
    dbInstance.settings({
      ignoreUndefinedProperties: true,
      preferRest: !process.env.FIRESTORE_EMULATOR_HOST,
    });
  }
  return dbInstance;
}
