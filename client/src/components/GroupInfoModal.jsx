"use client";

import { useEffect, useState } from "react";
import {
  FiLoader,
  FiSearch,
  FiX,
  FiLogOut,
  FiAlertCircle,
  FiUserCheck,
} from "react-icons/fi";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { api } from "@/lib/api";

export default function GroupInfoModal({ open, onClose, conv, meId, onLeft }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  const amAdmin = info?.adminId === meId;

  const loadInfo = async () => {
    setLoading(true);
    try {
      const d = await api.get(`/api/conversations/${conv.id}`);
      setInfo(d.conversation);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setQuery("");
      setCandidates([]);
      setError("");
      setConfirmLeave(false);
      loadInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // جستجو برای افزودن عضو
  useEffect(() => {
    if (!open || !amAdmin) return;
    const q = query.trim();
    if (!q) {
      setCandidates([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .get(`/api/users?q=${encodeURIComponent(q)}`)
        .then((d) => {
          const memberIds = new Set((info?.members || []).map((m) => m.id));
          setCandidates(d.users.filter((u) => !memberIds.has(u.id)));
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, amAdmin]);

  const addMember = async (userId) => {
    setBusy(true);
    setError("");
    try {
      await api.put(`/api/groups/${conv.id}/members`, {
        action: "add",
        userIds: [userId],
      });
      setCandidates((prev) => prev.filter((u) => u.id !== userId));
      await loadInfo();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const removeMember = async (userId) => {
    setBusy(true);
    setError("");
    try {
      await api.put(`/api/groups/${conv.id}/members`, {
        action: "remove",
        userId,
      });
      await loadInfo();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const leave = async () => {
    setBusy(true);
    try {
      await api.post(`/api/groups/${conv.id}/leave`);
      onLeft?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="اطلاعات گروه">
      {loading && !info ? (
        <div className="flex justify-center py-10">
          <FiLoader className="animate-spin text-indigo-400" size={26} />
        </div>
      ) : (
        <>
          {/* هدر گروه */}
          <div className="flex flex-col items-center gap-2 mb-5">
            <Avatar
              src={info?.avatar}
              name={info?.name}
              userId={conv.id}
              size={72}
            />
            <p className="font-bold">{info?.name}</p>
            <p className="text-xs text-gray-400">
              {(info?.membersCount || 0).toLocaleString("fa-IR")} عضو
            </p>
          </div>

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
              <FiAlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* افزودن عضو (مدیر) */}
          {amAdmin && (
            <div className="mb-4">
              <div className="relative">
                <FiSearch
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو برای افزودن عضو..."
                  className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 py-2 pr-10 pl-4 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition duration-150"
                />
              </div>
              {searching && (
                <div className="flex justify-center py-3">
                  <FiLoader
                    className="animate-spin text-indigo-400"
                    size={18}
                  />
                </div>
              )}
              {candidates.map((u) => (
                <button
                  key={u.id}
                  onClick={() => addMember(u.id)}
                  disabled={busy}
                  className="w-full mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-right bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors duration-150 disabled:opacity-60"
                >
                  <Avatar
                    src={u.avatar}
                    name={u.displayName || u.username}
                    userId={u.id}
                    size={34}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {u.displayName || u.username}
                    </p>
                    <p
                      dir="ltr"
                      className="text-[11px] text-gray-400 text-right truncate"
                    >
                      @{u.username}
                    </p>
                  </div>
                  <FiUserCheck className="text-indigo-500" size={18} />
                </button>
              ))}
            </div>
          )}

          {/* لیست اعضا */}
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {(info?.members || []).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-150"
              >
                <Avatar
                  src={m.avatar}
                  name={m.displayName || m.username}
                  userId={m.id}
                  size={38}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {m.displayName || m.username}
                    {m.id === meId && (
                      <span className="text-[11px] text-gray-400 font-normal">
                        {" "}
                        (شما)
                      </span>
                    )}
                  </p>
                  <p
                    dir="ltr"
                    className="text-[11px] text-gray-400 text-right truncate"
                  >
                    @{m.username}
                  </p>
                </div>
                {m.id === info?.adminId && (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 rounded-full px-2 py-0.5">
                    مدیر
                  </span>
                )}
                {amAdmin && m.id !== info?.adminId && m.id !== meId && (
                  <button
                    onClick={() => removeMember(m.id)}
                    disabled={busy}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 transition-colors duration-150 disabled:opacity-50"
                    aria-label="حذف عضو"
                  >
                    <FiX size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* خروج از گروه */}
          <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-4">
            {!confirmLeave ? (
              <button
                onClick={() => setConfirmLeave(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-150"
              >
                <FiLogOut size={16} />
                خروج از گروه
              </button>
            ) : (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3">
                <p className="text-xs text-red-600 dark:text-red-400 mb-2.5">
                  {amAdmin
                    ? "با خروج تو، مدیریت به یکی از اعضا منتقل می‌شود. مطمئنی؟"
                    : "از این گروه خارج می‌شوی؟"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors duration-150"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={leave}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500 py-2 text-xs font-bold text-white hover:bg-red-600 transition-colors duration-150 disabled:opacity-60"
                  >
                    {busy && <FiLoader className="animate-spin" size={13} />}
                    بله، خارج شو
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
