import type { InputHTMLAttributes } from "react";

export function Field({
  label,
  error,
  hint,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: string }) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        id={inputId}
        {...props}
        aria-invalid={Boolean(error)}
        className={`block w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition focus:ring-4 ${
          error
            ? "border-red-400 focus:ring-red-100"
            : "border-gray-200 focus:border-brand-500 focus:ring-brand-100"
        }`}
      />
      {error ? (
        <span className="mt-1 block text-sm text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}
