"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FirebaseNotConfigured } from "@/components/auth/FirebaseNotConfigured";
import { useAuth } from "@/components/providers/AuthProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authErrorMessage, validateEmail } from "@/lib/auth-errors";
import { getFirebaseAuth } from "@/lib/firebase/client";

const REASONS: Record<string, string> = {
  expired: "เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
  deleted: "ลบบัญชีและข้อมูลทั้งหมดเรียบร้อยแล้ว ขอบคุณที่ร่วมทดลอง 🙏",
  required: "กรุณาเข้าสู่ระบบก่อนเล่น",
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [next, setNext] = useState("/play");

  useEffect(() => {
    // อ่าน query string ฝั่ง client (ไม่ต้องใช้ Suspense)
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    const n = params.get("next");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reason && REASONS[reason]) setNotice(REASONS[reason]);
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
  }, []);

  useEffect(() => {
    if (!authLoading && user && !submitting) router.replace(next);
  }, [authLoading, user, submitting, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    if (!password) return setError("กรุณากรอกรหัสผ่าน");
    const auth = getFirebaseAuth();
    if (!auth) return;
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold text-brand-900">เข้าสู่ระบบ</h1>
      {!configured && <FirebaseNotConfigured />}
      {notice && <Alert className="mb-4">{notice}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="อีเมล"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="รหัสผ่าน"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" loading={submitting} disabled={!configured}>
          เข้าสู่ระบบ
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-700 underline">
          ลืมรหัสผ่าน?
        </Link>
        <Link href="/register" className="font-semibold text-brand-700 underline">
          สมัครสมาชิก
        </Link>
      </div>
    </>
  );
}
