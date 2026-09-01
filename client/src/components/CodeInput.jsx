"use client";

import { useEffect, useRef } from "react";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(str) {
  return str.replace(/[۰-۹٠-٩]/g, (ch) => {
    const i = FA.indexOf(ch);
    if (i > -1) return String(i);
    return String(AR.indexOf(ch));
  });
}

export default function CodeInput({ value, onChange, onComplete, disabled }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const update = (index, raw) => {
    const digit = normalizeDigits(raw).replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("").slice(0, 6);
    onChange(joined);
    if (digit && index < 5) refs.current[index + 1]?.focus();
    if (joined.length === 6) onComplete?.(joined);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      update(index - 1, "");
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = normalizeDigits(e.clipboardData.getData("text"))
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!text) return;
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) onComplete?.(text);
  };

  return (
    <div dir="ltr" className="flex justify-center gap-1.5 sm:gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-10 h-12 sm:w-12 sm:h-14 rounded-xl border text-center text-lg sm:text-xl font-bold outline-none transition duration-150 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
            d
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300"
              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}
