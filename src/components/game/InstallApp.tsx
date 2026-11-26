"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * ติดตั้งแอปลงหน้าจอโฮม (PWA) — เปิดเร็วขึ้นในครั้งต่อไป (Nielsen #7 Flexibility and efficiency)
 * Android/Chrome: ใช้ปุ่มติดตั้งของระบบ · iPhone: บอกวิธีผ่านเมนูแชร์
 */
export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(Boolean(standalone));
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return <p className="text-sm text-gray-600">✅ ติดตั้ง Movemai บนหน้าจอแล้ว</p>;
  }
  if (promptEvent) {
    return (
      <Button
        variant="secondary"
        className="w-full"
        onClick={async () => {
          await promptEvent.prompt();
          await promptEvent.userChoice.catch(() => undefined);
          setPromptEvent(null);
        }}
      >
        📲 ติดตั้งแอปบนหน้าจอโฮม
      </Button>
    );
  }
  return (
    <p className="text-sm text-gray-600">
      {isIos
        ? "iPhone: เปิดใน Safari → กดปุ่มแชร์ (สี่เหลี่ยมมีลูกศรขึ้น) → \"เพิ่มไปยังหน้าจอโฮม\""
        : "เปิดเมนูของเบราว์เซอร์ (⋮) → \"ติดตั้งแอป\" หรือ \"เพิ่มลงในหน้าจอหลัก\""}
    </p>
  );
}
