"use client";

import { useState, useEffect } from "react";
import {
  FiLogOut,
  FiEyeOff,
  FiMoon,
  FiBell,
  FiSmartphone,
} from "react-icons/fi";
import {
  getInstallPrompt,
  clearInstallPrompt,
  onInstallPrompt,
} from "@/lib/pwa";
import Modal from "./Modal";
import Toggle from "./Toggle";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "./ThemeProvider";
import { api } from "@/lib/api";

function Row({ icon, title, desc, children, disabled }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-150 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-300 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{title}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsModal({ open, onClose }) {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [savingSeen, setSavingSeen] = useState(false);
  const [notifPerm, setNotifPerm] = useState("default");
  const [installEvt, setInstallEvt] = useState(null);

  useEffect(() => {
    if (!open) return;
    setNotifPerm(
      "Notification" in window ? Notification.permission : "unsupported",
    );
    setInstallEvt(getInstallPrompt());
    return onInstallPrompt(setInstallEvt);
  }, [open]);

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setNotifPerm(p);
  };

  const install = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice;
    clearInstallPrompt();
    setInstallEvt(null);
  };
  const changeHideLastSeen = async (value) => {
    setSavingSeen(true);
    try {
      const d = await api.put("/api/users/me/settings", {
        hideLastSeen: value,
      });
      updateUser(d.user);
    } catch {}
    setSavingSeen(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="تنظیمات">
      <div className="space-y-1">
        <Row
          icon={<FiBell size={18} />}
          title="اعلان‌های مرورگر"
          desc={
            notifPerm === "granted"
              ? "فعال است"
              : notifPerm === "denied"
                ? "مسدود شده — از تنظیمات مرورگر فعال کن"
                : notifPerm === "unsupported"
                  ? "مرورگر تو پشتیبانی نمی‌کند"
                  : "برای پیام‌های جدید مطلع شو"
          }
        >
          {notifPerm === "default" && (
            <button
              onClick={enableNotifications}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors duration-150"
            >
              فعال کردن
            </button>
          )}
          {notifPerm === "granted" && (
            <span className="text-xs font-bold text-emerald-500">فعال</span>
          )}
        </Row>

        {installEvt && (
          <Row
            icon={<FiSmartphone size={18} />}
            title="نصب گپینو روی دستگاه"
            desc="مثل یک اپلیکیشن واقعی اجرا می‌شود"
          >
            <button
              onClick={install}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors duration-150"
            >
              نصب
            </button>
          </Row>
        )}
        <Row
          icon={<FiMoon size={18} />}
          title="حالت تاریک"
          desc={theme === "dark" ? "فعال" : "غیرفعال"}
        >
          <Toggle checked={theme === "dark"} onChange={toggleTheme} />
        </Row>
        <Row
          icon={<FiEyeOff size={18} />}
          title="مخفی کردن آخرین بازدید"
          desc="دیگران آخرین بازدید تو را نمی‌بینند"
          disabled={savingSeen}
        >
          <Toggle
            checked={!!user?.settings?.hideLastSeen}
            onChange={changeHideLastSeen}
            disabled={savingSeen}
          />
        </Row>
      </div>

      <button
        onClick={logout}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150"
      >
        <FiLogOut size={16} />
        خروج از حساب
      </button>
    </Modal>
  );
}
