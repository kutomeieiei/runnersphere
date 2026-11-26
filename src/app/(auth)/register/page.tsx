"use client";

import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FirebaseNotConfigured } from "@/components/auth/FirebaseNotConfigured";
import { useAuth } from "@/components/providers/AuthProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { GAME_CONFIG } from "@/config/game";
import { api, ApiClientError } from "@/lib/api-client";
import { authErrorMessage, validateEmail, validatePassword } from "@/lib/auth-errors";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { PENDING_NICKNAME_KEY } from "@/lib/storage-keys";

type Errors = Partial<Record<"nickname" | "email" | "password" | "confirm" | "form", string>>;

export default function RegisterPage() {
  const router = useRouter();
  const { configured } = useAuth();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    const nick = nickname.trim();
    if (!nick) e.nickname = "กรุณาตั้งชื่อเล่นสำหรับแสดงในเกม";
    else if ([...nick].length > GAME_CONFIG.profile.nicknameMaxLength)
      e.nickname = `ชื่อเล่นยาวได้ไม่เกิน ${GAME_CONFIG.profile.nicknameMaxLength} ตัวอักษร`;
    const em = validateEmail(email);
    if (em) e.email = em;
    const pw = validatePassword(password);
    if (pw) e.password = pw;
    if (confirm !== password) e.confirm = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const auth = getFirebaseAuth();
    if (!auth) return;

    setSubmitting(true);
    try {
      // เก็บชื่อเล่นไว้ก่อน เผื่อสร้างโปรไฟล์ไม่สำเร็จ จะลองใหม่ตอนเข้าเกม
      try {
        sessionStorage.setItem(PENDING_NICKNAME_KEY, nickname.trim());
      } catch {}
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      try {
        // server สร้าง users/{uid} พร้อมสัตว์เลี้ยงและเหรียญเริ่มต้น
        await api("/api/profile", { method: "POST", body: { nickname: nickname.trim() } });
        try {
          sessionStorage.removeItem(PENDING_NICKNAME_KEY);
        } catch {}
      } catch (err) {
        if (!(err instanceof ApiClientError)) throw err;
        // ไม่เป็นไร GameProvider จะลองสร้างให้อีกครั้ง
      }
      if (GAME_CONFIG.features.requireEmailVerification) {
        await sendEmailVerification(cred.user).catch(() => undefined);
        router.replace("/verify-email");
      } else {
        router.replace("/play");
      }
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-brand-900">สมัครสมาชิก</h1>
      <p className="mb-4 text-sm text-gray-600">ใช้อีเมลอะไรก็ได้ ไม่ต้องกรอกชื่อจริง</p>
      {!configured && <FirebaseNotConfigured />}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="ชื่อเล่น (แสดงในเกม)"
          name="nickname"
          autoComplete="nickname"
          maxLength={GAME_CONFIG.profile.nicknameMaxLength}
          showCount
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          error={errors.nickname}
          hint="ไม่ต้องใช้ชื่อจริง เช่น ต้นกล้า, Mew"
        />
        <Field
          label="อีเมล"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          label="รหัสผ่าน"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`อย่างน้อย ${GAME_CONFIG.auth.passwordMinLength} ตัวอักษร`}
        />
        <Field
          label="ยืนยันรหัสผ่าน"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        {errors.form && <Alert tone="error">{errors.form}</Alert>}
        <Button type="submit" className="w-full" loading={submitting} disabled={!configured}>
          สมัครและเริ่มเล่น
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="font-semibold text-brand-700 underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
