"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

/**
 * Firebase client SDK — ใช้เฉพาะ Authentication
 * (ข้อมูลเกมทั้งหมดอ่าน/เขียนผ่าน API ฝั่ง server)
 * ค่าเหล่านี้เป็น public config ของ Firebase Web App (ไม่ใช่ secret)
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
);

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured || typeof window === "undefined") return null;
  if (authInstance) return authInstance;
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  authInstance.languageCode = "th"; // อีเมลรีเซ็ตรหัสผ่าน/ยืนยันอีเมลเป็นภาษาไทย
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator) {
    connectAuthEmulator(authInstance, `http://${emulator}`, { disableWarnings: true });
  }
  return authInstance;
}
