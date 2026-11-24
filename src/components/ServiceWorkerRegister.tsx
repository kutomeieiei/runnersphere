"use client";

import { useEffect } from "react";

/** ลงทะเบียน service worker (PWA) เฉพาะ production เพื่อไม่ให้ cache รบกวนตอนพัฒนา */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
