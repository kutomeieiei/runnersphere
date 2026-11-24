export function DirectionArrow({ bearing }: { bearing: number }) {
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-50 ring-2 ring-brand-200">
      <span className="absolute top-0.5 text-[10px] font-bold text-brand-700">N</span>
      <svg
        viewBox="0 0 24 24"
        className="h-10 w-10 text-brand-600 transition-transform duration-500"
        style={{ transform: `rotate(${bearing}deg)` }}
        aria-hidden
      >
        <path d="M12 2 L19 20 L12 16 L5 20 Z" fill="currentColor" />
      </svg>
    </div>
  );
}
