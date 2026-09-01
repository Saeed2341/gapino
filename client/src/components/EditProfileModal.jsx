"use client";

import { useEffect, useRef, useState } from "react";
import { FiCamera, FiLoader, FiCheck, FiAlertCircle } from "react-icons/fi";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const USERNAME_REGEX = /^[a-z0-9_]{4,24}$/;

export default function EditProfileModal({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setError("");
      setSaved(false);
    }
  }, [open, user]);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم تصویر حداکثر ۲ مگابایت است.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const token = localStorage.getItem("gapino-token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/me/avatar`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "آپلود ناموفق بود.");
      updateUser(d.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const name = displayName.trim();
    const uname = username.trim().toLowerCase().replace(/^@+/, "");
    if (!name) return setError("نام نمی‌تواند خالی باشد.");
    if (!USERNAME_REGEX.test(uname))
      return setError("آیدی باید ۴ تا ۲۴ کاراکتر انگلیسی، عدد یا _ باشد.");

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const d = await api.put("/api/users/me", {
        displayName: name,
        username: uname,
        bio: bio.trim(),
      });
      updateUser(d.user);
      setSaved(true);
      setTimeout(onClose, 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="ویرایش حساب کاربری">
      <form onSubmit={save} className="space-y-4">
        {/* عکس پروفایل */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <Avatar
              src={user?.avatar}
              name={displayName || user?.displayName}
              userId={user?.id}
              size={88}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center border-2 border-white dark:border-gray-900 transition-transform duration-150 hover:scale-110"
              aria-label="تغییر عکس پروفایل"
            >
              {uploading ? (
                <FiLoader className="animate-spin" size={14} />
              ) : (
                <FiCamera size={14} />
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">حداکثر ۲ مگابایت</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFileChange}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* نام */}
        <div>
          <label className="block text-sm font-medium mb-1.5">نام نمایشی</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150"
          />
        </div>

        {/* آیدی */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            آیدی کاربری
          </label>
          <div className="relative" dir="ltr">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              @
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              dir="ltr"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2.5 pl-8 pr-4 text-left text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150"
            />
          </div>
        </div>

        {/* بیو */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">بیو</label>
            <span className="text-[11px] text-gray-400">{bio.length}/۲۰۰</span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2.5 px-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition duration-150 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? (
            <FiLoader className="animate-spin" size={18} />
          ) : saved ? (
            <FiCheck size={18} />
          ) : null}
          {saved ? "ذخیره شد" : "ذخیره تغییرات"}
        </button>
      </form>
    </Modal>
  );
}
