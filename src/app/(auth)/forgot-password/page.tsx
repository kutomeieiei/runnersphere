"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { FirebaseNotConfigured } from "@/components/auth/FirebaseNotConfigured";
import { useAuth } from "@/components/providers/AuthProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authErrorMessage, validateEmail } from "@/lib/auth-errors";
import { getFirebaseAuth } from "@/lib/firebase/client";

export default function ForgotPasswordPage() {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validateEmail(email);
    if (err) return setError(err);
    const auth = getFirebaseAuth();
    if (!auth) return;
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      // ไม่บอกว่าอีเมลนี้มีบัญชีหรือไม่ (กันการสุ่มเดาอีเมล)
      if (code === "auth/user-not-found") setSent(true);
      else setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">ลืมรหัสผ่าน</h1>
      <p className="mb-4 text-sm text-gray-600">กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
      {!configured && <FirebaseNotConfigured />}
      {sent ? (
        <Alert tone="success" title="ส่งอีเมลแล้ว">
          ถ้าอีเมลนี้มีบัญชีอยู่ คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ภายในไม่กี่นาที (ลองดูในโฟลเดอร์สแปมด้วย)
        </Alert>
      ) : (
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
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" className="w-full" loading={submitting} disabled={!configured}>
            ส่งลิงก์รีเซ็ตรหัสผ่าน
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-brand-700 underline">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
