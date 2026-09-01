"use client";

import { useEffect } from "react";

export default function ViewportFix() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    // ارتفاع واقعی قابل‌مشاهده (منهای کیبورد) → متغیر CSS
    const setHeight = () => {
      document.documentElement.style.setProperty("--app-height", `${vv.height}px`);
    };

    // جلوگیری از پن شدن صفحه توسط کیبورد (هدر ثابت می‌ماند)
    const pinScroll = () => {
      const canScroll =
        document.documentElement.scrollHeight > window.innerHeight;
      if (!canScroll && window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    setHeight();
    vv.addEventListener("resize", setHeight);
    vv.addEventListener("scroll", pinScroll);

    return () => {
      vv.removeEventListener("resize", setHeight);
      vv.removeEventListener("scroll", pinScroll);
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);

  return null;
}