"use client";

import { onIdTokenChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api-client";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  /** กำลังออกจากระบบโดยตั้งใจ (ให้ guard ไม่ redirect ซ้อน) */
  signingOut: boolean;
  signOut: (reason?: "expired" | "deleted") => Promise<void>;
  /** โหลดสถานะผู้ใช้ใหม่ (เช่น หลังยืนยันอีเมล) */
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  // user object ของ Firebase ถูกแก้ไขในที่ (mutate) หลัง reload() จึงต้องบังคับ re-render
  const [version, setVersion] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onIdTokenChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) setSigningOut(false);
    });
  }, []);

  const signOut = useCallback(
    async (reason?: "expired" | "deleted") => {
      setSigningOut(true);
      const auth = getFirebaseAuth();
      if (auth) await fbSignOut(auth).catch(() => undefined);
      router.replace(reason ? `/login?reason=${reason}` : "/login");
    },
    [router],
  );

  // เมื่อ API ตอบ 401 (token หมดอายุ/ถูกเพิกถอน) → ออกจากระบบและให้ล็อกอินใหม่
  useEffect(() => {
    const onExpired = () => void signOut("expired");
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [signOut]);

  const reloadUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    setUser(auth.currentUser);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ user, loading, configured: isFirebaseConfigured, signingOut, signOut, reloadUser }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, signingOut, signOut, reloadUser, version],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
