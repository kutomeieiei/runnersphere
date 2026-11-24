type Tone = "info" | "warning" | "error" | "success";

const tones: Record<Tone, string> = {
  info: "bg-sky-50 text-sky-900 ring-sky-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  error: "bg-red-50 text-red-900 ring-red-200",
  success: "bg-brand-50 text-brand-900 ring-brand-200",
};

const icons: Record<Tone, string> = { info: "ℹ️", warning: "⚠️", error: "⛔", success: "✅" };

export function Alert({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl p-3 text-sm ring-1 ${tones[tone]} ${className}`}>
      <div className="flex gap-2">
        <span aria-hidden>{icons[tone]}</span>
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
