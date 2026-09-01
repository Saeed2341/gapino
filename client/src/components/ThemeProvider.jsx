"use client";

import { createContext, useContext, useEffect, useState } from "react";

const KEY = "gapino-theme";
const OLD_KEY = "peivand-theme";

const ThemeContext = createContext({ theme: "light", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  // null یعنی هنوز مقدار واقعی مشخص نشده
  const [theme, setTheme] = useState(null);

  // فقط یک‌بار در شروع: خواندن از localStorage (با مهاجرت کلید قدیمی)
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(KEY);
      if (saved !== "dark" && saved !== "light") {
        const old = localStorage.getItem(OLD_KEY);
        if (old === "dark" || old === "light") {
          saved = old;
          localStorage.setItem(KEY, old);
        }
        localStorage.removeItem(OLD_KEY);
      }
    } catch {}

    if (saved !== "dark" && saved !== "light") {
      saved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.classList.toggle("dark", saved === "dark");
    setTheme(saved);
  }, []);

  // بعد از آماده شدن: اعمال + ذخیره (قبل از آن هیچ چیزی ذخیره نمی‌شود!)
  useEffect(() => {
    if (theme === null) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme: theme ?? "light", toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
