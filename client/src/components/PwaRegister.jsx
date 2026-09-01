"use client";

import { useEffect } from "react";
import { setInstallPrompt, clearInstallPrompt } from "@/lib/pwa";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onBip = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => clearInstallPrompt();
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
