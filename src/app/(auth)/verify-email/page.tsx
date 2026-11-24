"use client";

import { sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { authErrorMessage } from "@/lib/auth-errors";

/** ใช้เมื่อเปิด feature flag requireEmailVerification */
export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, reloadUser, signOut } = useAuth();
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user?.emailVerified) router.replace("/play");
  }, [loading, user, router]);

  async function resend() {
    if (!user) return;
    setBusy(true);
    try {
      await sendEmailVerification(user);
      setMessage({ tone: "success", text: "ส่งอีเมลยืนยันอีกครั้งแล้ว" });
    } catch (err) {
      setMessage({ tone: "error", text: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setBusy(true);
    try {
      await reloadUser();
      if (!user?.emailVerified) setMessage({ tone: "info", text: "ยังไม่พบการยืนยัน ลองกดลิงก์ในอีเมลก่อนนะ" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-brand-900">ยืนยันอีเมล</h1>
      <p className="mb-4 text-sm text-gray-700">
        เราส่งลิงก์ยืนยันไปที่ <b>{user?.email}</b> แล้ว กดลิงก์ในอีเมล แล้วกลับมากดปุ่มด้านล่าง
      </p>
      {message && <Alert tone={message.tone} className="mb-4">{message.text}</Alert>}
      <div className="space-y-3">
        <Button className="w-full" onClick={check} loading={busy}>
          ฉันยืนยันแล้ว
        </Button>
        <Button className="w-full" variant="secondary" onClick={resend} disabled={busy}>
          ส่งอีเมลยืนยันอีกครั้ง
        </Button>
        <Button className="w-full" variant="ghost" onClick={() => signOut()}>
          ออกจากระบบ
        </Button>
      </div>
    </>
  );
}
