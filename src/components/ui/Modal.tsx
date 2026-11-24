"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  title,
  children,
  onClose,
  dismissible = true,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  dismissible?: boolean;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  if (!open || typeof document === "undefined") return null;
  // render ผ่าน portal ไปที่ body เพื่อไม่ให้ถูกบังด้วย stacking context ของ layout (เช่น bottom nav)
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={() => dismissible && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-xl"
      >
        <h2 id={titleId} className="mb-3 text-xl font-bold text-brand-900">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
