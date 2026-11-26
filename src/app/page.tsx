"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/play");
  }, [loading, user, router]);

  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
      <div className="mt-10 flex flex-1 flex-col items-center text-center">
        <div className="mb-4 text-7xl" aria-hidden>
          🌏🐾
        </div>
        <h1 className="text-4xl font-bold text-brand-800">Movemai</h1>
        <p className="mt-3 text-lg text-gray-700">
          เดินไปยังจุดภารกิจในโรงเรียน เก็บเหรียญ แล้วนำไปเลี้ยงสัตว์เลี้ยงของคุณ
        </p>
        <ul className="mt-6 w-full space-y-3 text-left">
          {[
            ["🗺️", "เลือกพื้นที่เล่น แล้วสุ่มจุดภารกิจในพื้นที่นั้น"],
            ["🪙", "เดินไปถึงจุด รับเหรียญตามระยะทาง"],
            ["🐣", "ซื้ออาหารให้สัตว์เลี้ยง ดูมันโตขึ้นทุกวัน"],
            ["💧", "เดินอย่างปลอดภัย มีเตือนให้พักและดื่มน้ำ"],
          ].map(([icon, text]) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-brand-100">
              <span className="text-2xl" aria-hidden>
                {icon}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8 space-y-3">
        <Link
          href="/register"
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand-600 text-lg font-semibold text-white shadow-sm"
        >
          สมัครเล่นฟรี
        </Link>
        <Link
          href="/login"
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-white text-lg font-semibold text-brand-800 ring-1 ring-brand-200"
        >
          เข้าสู่ระบบ
        </Link>
        <p className="pt-2 text-center text-xs text-gray-500">
          ต้นแบบ (prototype) เพื่อการทดลอง ·{" "}
          <Link href="/privacy" className="underline">
            แอปใช้ตำแหน่งของคุณอย่างไร
          </Link>
        </p>
      </div>
    </main>
  );
}
