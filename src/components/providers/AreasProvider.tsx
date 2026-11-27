"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PlayArea } from "@/config/game";
import { ACTIVE_AREAS } from "@/lib/areas";
import { api } from "@/lib/api-client";

type AreasResponse = { areas: PlayArea[]; editor: { enabled: boolean; canEdit: boolean } };

type AreasContextValue = {
  /** พื้นที่ที่ใช้จริง (config + การแก้จากเครื่องมือแก้แผนที่) */
  areas: PlayArea[];
  editor: { enabled: boolean; canEdit: boolean };
  refreshAreas: () => Promise<void>;
};

const AreasContext = createContext<AreasContextValue>({
  areas: ACTIVE_AREAS,
  editor: { enabled: false, canEdit: false },
  refreshAreas: async () => undefined,
});

/** โหลดพื้นที่จาก server (ถ้าโหลดไม่ได้ ใช้ค่าใน config ไปก่อน) */
export function AreasProvider({ children }: { children: React.ReactNode }) {
  const [areas, setAreas] = useState<PlayArea[]>(ACTIVE_AREAS);
  const [editor, setEditor] = useState({ enabled: false, canEdit: false });

  const refreshAreas = useCallback(async () => {
    try {
      const res = await api<AreasResponse>("/api/areas");
      if (Array.isArray(res.areas) && res.areas.length) setAreas(res.areas);
      setEditor(res.editor);
    } catch {
      // ใช้ค่าเดิมต่อไป (ออฟไลน์ / server มีปัญหา)
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAreas();
  }, [refreshAreas]);

  const value = useMemo(() => ({ areas, editor, refreshAreas }), [areas, editor, refreshAreas]);
  return <AreasContext.Provider value={value}>{children}</AreasContext.Provider>;
}

export const useAreas = () => useContext(AreasContext);
