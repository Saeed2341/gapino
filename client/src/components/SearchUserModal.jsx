"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiLoader, FiUserPlus, FiAlertCircle } from "react-icons/fi";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { api } from "@/lib/api";

export default function SearchUserModal({ open, onClose, onStarted }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [results, setResults] = useState(null); // null = هنوز جستجو نشده
  const [error, setError] = useState("");

  const search = async (e) => {
    e?.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setError("");
    try {
      const d = await api.get(
        `/api/users/search?q=${encodeURIComponent(query.trim())}`,
      );
      setResults(d.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const start = async (userId) => {
    if (startingId) return;
    setStartingId(userId);
    setError("");
    try {
      const d = await api.post("/api/conversations", { userId });
      onStarted?.();
      onClose();
      router.push(`/chat/${d.conversation.id}`);
    } catch (err) {
      setError(err.message);
      setStartingId(null);
    }
  };

  const reset = () => {
    setQuery("");
    setResults(null);
    setError("");
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="گفتگوی جدید"
    >
      <p className="text-xs text-gray-400 mb-3">
        ایمیل یا آیدیِ کاربر را وارد کن. اگر در گپینو ثبت‌نام شده باشد، پیدا
        می‌شود.
      </p>

      <form onSubmit={search} className="relative mb-4">
        <FiSearch
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          dir="ltr"
          autoFocus
          placeholder="you@example.com یا username"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3 pr-11 pl-4 text-left text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150"
        />
      </form>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <FiAlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {searching && (
        <div className="flex justify-center py-8">
          <FiLoader className="animate-spin text-indigo-400" size={26} />
        </div>
      )}

      {!searching && results?.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-gray-400 dark:text-gray-500 text-sm">
          <FiUserPlus size={32} />
          کاربری با این ایمیل/آیدی پیدا نشد.
        </div>
      )}

      {!searching &&
        results?.map((u) => (
          <button
            key={u.id}
            onClick={() => start(u.id)}
            disabled={!!startingId}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-right hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 disabled:opacity-60"
          >
            <Avatar
              src={u.avatar}
              name={u.displayName || u.username}
              userId={u.id}
              size={44}
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">
                {u.displayName || u.username}
              </p>
              <p
                dir="ltr"
                className="text-xs text-gray-400 text-right truncate"
              >
                @{u.username}
              </p>
            </div>
            {startingId === u.id && (
              <FiLoader className="animate-spin text-indigo-500" size={18} />
            )}
          </button>
        ))}
    </Modal>
  );
}
