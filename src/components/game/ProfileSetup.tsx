"use client";

import { useState } from "react";
import { useGame } from "@/components/providers/GameProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { GAME_CONFIG } from "@/config/game";
import { ApiClientError } from "@/lib/api-client";

/** กรณีสมัครแล้วแต่สร้างโปรไฟล์ไม่สำเร็จ (เช่น เน็ตหลุด) ให้ตั้งชื่อเล่นใหม่ */
export function ProfileSetup() {
  const { needsProfile, createProfile } = useGame();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createProfile(nickname);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={needsProfile} title="ตั้งชื่อเล่นของคุณ" dismissible={false}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="ชื่อเล่น (แสดงในเกม)"
          name="nickname"
          value={nickname}
          maxLength={GAME_CONFIG.profile.nicknameMaxLength}
          onChange={(e) => setNickname(e.target.value)}
          hint="ไม่ต้องใช้ชื่อจริง"
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" loading={busy} disabled={!nickname.trim()}>
          เริ่มเล่น
        </Button>
      </form>
    </Modal>
  );
}
