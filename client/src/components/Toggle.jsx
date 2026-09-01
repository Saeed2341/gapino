"use client";

export default function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 disabled:opacity-50 ${
        checked ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "-translate-x-5" : ""
        }`}
      />
    </button>
  );
}
