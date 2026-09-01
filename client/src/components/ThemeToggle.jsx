"use client";

import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="تغییر تم"
      className="w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === "dark" ? <FiSun size={19} /> : <FiMoon size={19} />}
    </button>
  );
}
