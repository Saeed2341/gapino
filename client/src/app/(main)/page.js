"use client";

import Logo from "@/components/Logo";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
      <Logo size={84} />
      <h2 className="text-2xl font-extrabold bg-gradient-to-l from-indigo-500 to-cyan-500 bg-clip-text text-transparent text-gray-900 dark:text-white">
        گپینو
      </h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs leading-6">
        برای شروع، از لیست کنار یک گفتگو را انتخاب کن یا با دکمه‌ی پایین
        سایدبار، کاربر جدیدی را با ایمیل یا آیدی پیدا کن.
      </p>
    </div>
  );
}
