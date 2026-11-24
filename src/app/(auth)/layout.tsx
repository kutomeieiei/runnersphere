import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="safe-top mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8">
      <Link href="/" className="mb-6 mt-4 flex items-center gap-2 self-start">
        <span aria-hidden className="text-3xl">🌏</span>
        <span className="text-2xl font-bold text-brand-800">RunSphere</span>
      </Link>
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brand-100">{children}</div>
      <p className="mt-6 text-center text-xs text-gray-500">
        ต้นแบบเพื่อการทดลอง ·{" "}
        <Link href="/privacy" className="underline">
          ความเป็นส่วนตัวและการใช้ตำแหน่ง
        </Link>
      </p>
    </main>
  );
}
