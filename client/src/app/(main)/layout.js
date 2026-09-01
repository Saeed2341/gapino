"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";

export default function MainLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const inChat = pathname?.startsWith("/chat/");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="h-dvh flex flex-col items-center justify-center gap-3">
        <Logo size={64} />
        <p className="text-sm text-gray-400 dark:text-gray-500">
          در حال بروزرسانی...
        </p>
      </main>
    );
  }
  if (!user) return null;

  return (
    <div className="h-dvh flex overflow-hidden">
      <aside
        className={`${
          inChat ? "hidden md:flex" : "flex"
        } w-full md:w-[350px] lg:w-[390px] shrink-0 flex-col border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950`}
      >
        <Sidebar />
      </aside>
      <main
        className={`${
          inChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0 bg-gray-50 dark:bg-gray-900`}
      >
        {children}
      </main>
    </div>
  );
}
