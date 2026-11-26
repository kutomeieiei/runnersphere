"use client";

import { useState, type InputHTMLAttributes } from "react";

/**
 * ช่องกรอกข้อมูลมาตรฐาน
 * - รหัสผ่านมีปุ่ม "แสดง/ซ่อน" กันพิมพ์ผิด (Nielsen #5 Error prevention)
 * - showCount แสดงจำนวนตัวอักษรที่เหลือ เมื่อมี maxLength
 */
export function Field({
  label,
  error,
  hint,
  id,
  showCount = false,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
  showCount?: boolean;
}) {
  const inputId = id ?? props.name;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const length = typeof props.value === "string" ? [...props.value].length : 0;
  const describedBy = error || hint ? `${inputId}-desc` : undefined;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 flex items-baseline justify-between text-sm font-medium text-gray-700">
        <span>{label}</span>
        {showCount && props.maxLength ? (
          <span className={`text-xs tabular-nums ${length >= props.maxLength ? "text-red-600" : "text-gray-400"}`}>
            {length}/{props.maxLength}
          </span>
        ) : null}
      </label>
      <div className="relative">
        <input
          id={inputId}
          {...props}
          type={isPassword && reveal ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`block w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition focus:ring-4 ${
            isPassword ? "pr-20" : ""
          } ${
            error
              ? "border-red-400 focus:ring-red-100"
              : "border-gray-200 focus:border-brand-500 focus:ring-brand-100"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            aria-pressed={reveal}
            className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            {reveal ? "ซ่อน" : "แสดง"}
          </button>
        )}
      </div>
      {error ? (
        <span id={describedBy} className="mt-1 block text-sm text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span id={describedBy} className="mt-1 block text-xs text-gray-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
