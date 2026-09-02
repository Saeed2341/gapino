"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { SlideNavProvider, useSlideNav } from "@/context/SlideNavContext";

function Shell({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { exiting } = useSlideNav();

  const inChat = pathname?.startsWith("/chat/");
  // هنگام خروج انیمیشنی، ترک برمی‌گردد در حالی‌که چت هنوز مانت است
  const shifted = inChat && !exiting;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="h-[var(--app-height,100dvh)] flex flex-col items-center justify-center gap-3">
        <Logo size={64} />
        <p className="text-sm text-gray-400 dark:text-gray-500">
          در حال بروزرسانی...
        </p>
      </main>
    );
  }
  if (!user) return null;

  return (
    <div className="h-[var(--app-height,100dvh)] overflow-hidden">
      {/* ریل اسلاید موبایل + همان چیدمان دوستونه دسکتاپ — یک درخت، بدون رندر دوباره */}
      <div
        c        className={`flex h-full w-[200%] md:w-auto max-md:transition-transform max-md:duration-[250ms] max-md:ease-out max-md:will-change-transform ${
          shifted ? "max-md:translate-x-1/2" : "max-md:translate-x-0"
        }`}
      >
        <aside className="w-1/2 md:w-[350px] lg:w-[390px] shrink-0 h-full flex flex-col border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
          <Sidebar />
        </aside>
        <main className="w-1/2 md:w-auto md:flex-1 h-full flex flex-col min-w-0 shrink-0 md:shrink bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function MainLayout({ children }) {
  return (
    <SlideNavProvider>
      <Shell>{children}</Shell>
    </SlideNavProvider>
  );
}
