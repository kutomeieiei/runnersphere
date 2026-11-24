"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/play", label: "แผนที่", icon: "🗺️" },
  { href: "/pet", label: "สัตว์เลี้ยง", icon: "🐣" },
  { href: "/stats", label: "สถิติ", icon: "📈" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? "text-brand-700" : "text-gray-500"
                }`}
              >
                <span className={`text-xl ${active ? "" : "grayscale"}`} aria-hidden>
                  {it.icon}
                </span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
