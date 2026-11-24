export function StatBar({
  label,
  value,
  max = 100,
  color,
  icon,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  icon: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-gray-700">
          {icon} {label}
        </span>
        <span className="tabular-nums text-gray-500">
          {Math.round(value)}/{max}
        </span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
