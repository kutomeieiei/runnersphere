"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="safe-top pointer-events-auto fixed inset-x-0 top-0 z-40 bg-gray-900 px-4 pb-2 text-center text-sm text-white">
      📡 ออฟไลน์อยู่ — การตรวจจุดและการให้อาหารจะทำต่อเมื่อกลับมาออนไลน์
    </div>
  );
}
