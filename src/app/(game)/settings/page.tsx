"use client";

import Link from "next/link";
import { useState } from "react";
import { SAFETY_RULES } from "@/components/game/SafetyGate";
import { useAuth } from "@/components/providers/AuthProvider";
import { useGame } from "@/components/providers/GameProvider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { GAME_CONFIG } from "@/config/game";
import { api, ApiClientError } from "@/lib/api-client";

const CONFIRM_WORD = "ลบบัญชี";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { me, updateNickname, refresh } = useGame();
  const [boardBusy, setBoardBusy] = useState(false);
  const [nickname, setNickname] = useState(me?.profile.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveNickname(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      await updateNickname(nickname);
      setSaved("บันทึกชื่อเล่นแล้ว");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLeaderboard(visible: boolean) {
    setBoardBusy(true);
    setError(null);
    try {
      await api("/api/leaderboard/visibility", { method: "POST", body: { visible } });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBoardBusy(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      await api("/api/account", { method: "DELETE" });
      await signOut("deleted");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "ลบบัญชีไม่สำเร็จ");
      setDeleting(false);
    }
  }

  return (
    <main className="safe-top mx-auto max-w-md space-y-4 px-4 pb-28">
      <h1 className="py-3 text-2xl font-bold text-brand-900">ตั้งค่า</h1>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
        <h2 className="mb-1 font-semibold text-brand-900">บัญชี</h2>
        <p className="mb-3 text-sm text-gray-600">อีเมล: {user?.email}</p>
        <form onSubmit={saveNickname} className="space-y-3">
          <Field
            label="ชื่อเล่น"
            name="nickname"
            value={nickname}
            maxLength={GAME_CONFIG.profile.nicknameMaxLength}
            onChange={(e) => setNickname(e.target.value)}
          />
          {saved && <Alert tone="success">{saved}</Alert>}
          <Button type="submit" variant="secondary" className="w-full" loading={saving} disabled={!nickname.trim()}>
            บันทึกชื่อเล่น
          </Button>
        </form>
      </section>

      {GAME_CONFIG.leaderboard.enabled && me && (
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
          <label htmlFor="leaderboard-visible" className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-semibold text-brand-900">แสดงชื่อในกระดานอันดับ</span>
              <span className="block text-sm text-gray-600">
                คนอื่นจะเห็นชื่อเล่นและจำนวนจุดของคุณ ไม่เห็นตำแหน่ง ปิดแล้วชื่อจะถูกลบออกทันที
              </span>
            </span>
            <input
              id="leaderboard-visible"
              type="checkbox"
              role="switch"
              checked={me.profile.leaderboardVisible}
              disabled={boardBusy}
              onChange={(e) => void toggleLeaderboard(e.target.checked)}
              className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-gray-300 transition before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-brand-600 checked:before:translate-x-5 disabled:opacity-50"
            />
          </label>
        </section>
      )}

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
        <h2 className="mb-2 font-semibold text-brand-900">เล่นอย่างปลอดภัย</h2>
        <ul className="space-y-2 text-sm text-gray-800">
          {SAFETY_RULES.map((r) => (
            <li key={r.text} className="flex gap-2">
              <span aria-hidden>{r.icon}</span>
              {r.text}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          เล่นได้สูงสุดวันละ {GAME_CONFIG.health.dailySpotCap} จุด และจะเตือนให้พักทุก {GAME_CONFIG.health.restReminderEvery} จุด
        </p>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
        <h2 className="mb-2 font-semibold text-brand-900">ความเป็นส่วนตัว</h2>
        <p className="text-sm text-gray-700">
          Movemai เป็นต้นแบบเพื่อการทดลอง ใช้ตำแหน่งเพื่อหาจุดภารกิจและตรวจการถึงจุดเท่านั้น
          ไม่เก็บเส้นทางเดิน และไม่แสดงตำแหน่งของคุณให้คนอื่นเห็น (คนอื่นเห็นแค่ชื่อเล่นและจำนวนจุดในกระดานอันดับ)
        </p>
        <Link href="/privacy" className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">
          อ่านรายละเอียด
        </Link>
      </section>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="space-y-3">
        <Button variant="secondary" className="w-full" onClick={() => void signOut()}>
          ออกจากระบบ
        </Button>
        <Button variant="ghost" className="w-full text-red-600" onClick={() => setDeleteOpen(true)}>
          ลบบัญชีและข้อมูลทั้งหมด
        </Button>
      </div>

      <Modal open={deleteOpen} title="ลบบัญชี?" onClose={() => !deleting && setDeleteOpen(false)}>
        <p className="text-sm text-gray-700">
          บัญชี เหรียญ สัตว์เลี้ยง และสถิติทั้งหมดจะถูกลบถาวร กู้คืนไม่ได้ พิมพ์คำว่า <b>{CONFIRM_WORD}</b> เพื่อยืนยัน
        </p>
        <div className="mt-3">
          <Field label="พิมพ์เพื่อยืนยัน" name="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={() => void deleteAccount()} loading={deleting} disabled={confirmText.trim() !== CONFIRM_WORD}>
            ลบถาวร
          </Button>
        </div>
      </Modal>
    </main>
  );
}
