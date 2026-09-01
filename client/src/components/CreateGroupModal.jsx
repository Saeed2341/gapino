"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiSearch,
  FiCheck,
  FiLoader,
  FiCamera,
  FiUsers,
  FiAlertCircle,
} from "react-icons/fi";
import Modal from "./Modal";
import Avatar from "./Avatar";
import { api, uploadFile } from "@/lib/api";

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName("");
      setAvatarUrl("");
      setQuery("");
      setUsers([]);
      setSelected([]);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setLoadingUsers(true);
      api
        .get(`/api/users?q=${encodeURIComponent(query.trim())}`)
        .then((d) => setUsers(d.users))
        .catch(() => {})
        .finally(() => setLoadingUsers(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const d = await uploadFile("/api/uploads/image", fd);
      setAvatarUrl(d.url);
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  };

  const create = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const d = await api.post("/api/groups", {
        name: name.trim(),
        memberIds: selected,
        avatar: avatarUrl,
      });
      onCreated?.(d.conversation);
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setCreating(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="گروه جدید">
      {/* عکس گروه */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          <Avatar
            src={avatarUrl}
            name={name || "؟"}
            userId="group-new"
            size={76}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center border-2 border-white dark:border-gray-900 transition-transform duration-150 hover:scale-110"
            aria-label="عکس گروه"
          >
            {uploading ? (
              <FiLoader className="animate-spin" size={14} />
            ) : (
              <FiCamera size={14} />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFile}
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          <FiAlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        placeholder="نام گروه..."
        autoFocus
        className="w-full mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150"
      />

      {/* انتخاب اعضا */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold">افزودن اعضا</p>
        {selected.length > 0 && (
          <span className="text-xs font-bold text-indigo-500">
            {selected.length.toLocaleString("fa-IR")} نفر انتخاب شده
          </span>
        )}
      </div>

      <div className="relative mb-2">
        <FiSearch
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی کاربران..."
          className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 py-2 pr-10 pl-4 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition duration-150"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
        {loadingUsers ? (
          <div className="flex justify-center py-6">
            <FiLoader className="animate-spin text-indigo-400" size={22} />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6">
            کاربری یافت نشد
          </p>
        ) : (
          users.map((u) => {
            const checked = selected.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-right transition-colors duration-150 ${
                  checked
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                }`}
              >
                <Avatar
                  src={u.avatar}
                  name={u.displayName || u.username}
                  userId={u.id}
                  size={38}
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
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-150 ${
                    checked
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {checked && <FiCheck size={12} />}
                </span>
              </button>
            );
          })
        )}
      </div>

      <button
        onClick={create}
        disabled={!name.trim() || creating}
        className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white transition duration-150 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-40"
      >
        {creating ? (
          <FiLoader className="animate-spin" size={18} />
        ) : (
          <FiUsers size={18} />
        )}
        ساخت گروه
      </button>
    </Modal>
  );
}
