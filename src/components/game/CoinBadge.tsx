export function CoinBadge({ coins }: { coins: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
      🪙 {coins}
    </span>
  );
}
