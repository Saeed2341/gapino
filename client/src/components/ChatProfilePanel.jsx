"use client";

import { useEffect, useState } from "react";
import {
  FiX,
  FiLoader,
  FiLink,
  FiFileText,
  FiImage,
  FiUsers,
  FiExternalLink,
} from "react-icons/fi";
import Avatar from "./Avatar";
import { api } from "@/lib/api";
import { faDayLabel, faTime } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const resolveSrc = (src) =>
  !src || /^https?:|^blob:|^data:/.test(src) ? src || "" : `${API_URL}${src}`;

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const TABS = [
  { key: "media", label: "رسانه‌ها", icon: <FiImage size={14} /> },
  { key: "links", label: "لینک‌ها", icon: <FiLink size={14} /> },
  { key: "files", label: "فایل‌ها", icon: <FiFileText size={14} /> },
];

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-gray-400 dark:text-gray-500">
      {icon}
      <p className="text-xs">{text}</p>
    </div>
  );
}

export default function ChatProfilePanel({
  open,
  onClose,
  conv,
  onOpenImage,
  onViewGroupInfo,
}) {
  const [tab, setTab] = useState("media");
  const [media, setMedia] = useState(null);
  const [links, setLinks] = useState(null);
  const [loading, setLoading] = useState(false);

  const isGroup = !!conv?.isGroup;
  const partner = conv?.partner;
  const displayName = isGroup
    ? conv?.name
    : partner?.displayName || partner?.username || "کاربر";
  const avatarSrc = isGroup ? conv?.avatar : partner?.avatar;

  // ریست با تغییر گفتگو / بستن
  useEffect(() => {
    setTab("media");
    setMedia(null);
    setLinks(null);
  }, [conv?.id, open]);

  // بستن با Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // لود تنبل داده‌ی هر تب (فقط بار اول)
  useEffect(() => {
    if (!open) return;
    if (tab === "media" && media === null) {
      setLoading(true);
      api
        .get(`/api/messages/${conv.id}/media`)
        .then((d) => setMedia(d.media))
        .catch(() => setMedia([]))
        .finally(() => setLoading(false));
    }
    if (tab === "links" && links === null) {
      setLoading(true);
      api
        .get(`/api/messages/${conv.id}/links`)
        .then((d) => setLinks(d.links))
        .catch(() => setLinks([]))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, open, conv?.id, media, links]);

  return (
    <aside
      className={`absolute inset-y-0 left-0 z-40 w-full sm:w-[360px] bg-white dark:bg-gray-950 border-l border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col transform transition-transform duration-200 ease-out ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* هدر پنل */}
      <header className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          aria-label="بستن"
        >
          <FiX size={20} />
        </button>
        <p className="font-bold text-sm">
          اطلاعات {isGroup ? "گروه" : "کاربر"}
        </p>
      </header>

      {/* پروفایل */}
      <div className="flex flex-col items-center gap-2 px-6 py-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={() => avatarSrc && onOpenImage(resolveSrc(avatarSrc))}
          disabled={!avatarSrc}
          className="rounded-full ring-2 ring-transparent hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all duration-150 disabled:cursor-default"
          aria-label="مشاهده عکس پروفایل"
        >
          <Avatar
            src={avatarSrc}
            name={displayName}
            userId={isGroup ? conv.id : partner?.id}
            size={96}
          />
        </button>

        <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white truncate max-w-full">
          {displayName}
        </p>

        {!isGroup && partner?.username && (
          <p dir="ltr" className="text-xs text-gray-400">
            @{partner.username}
          </p>
        )}

        {isGroup && (
          <>
            <p className="text-xs text-gray-400">
              {(conv.membersCount || 0).toLocaleString("fa-IR")} عضو
            </p>
            {onViewGroupInfo && (
              <button
                onClick={onViewGroupInfo}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150"
              >
                <FiUsers size={14} />
                اعضا و مدیریت
              </button>
            )}
          </>
        )}

        {!isGroup && partner?.bio && (
          <p className="mt-1 text-xs text-center leading-6 text-gray-500 dark:text-gray-400 line-clamp-3">
            {partner.bio}
          </p>
        )}
      </div>

      {/* تب‌ها */}
      <div className="flex gap-1 mx-3 mt-3 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-300"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.icon}
            {t.label}
            {t.key === "media" && media?.length > 0 && (
              <span className="text-[10px] text-gray-400">
                {media.length.toLocaleString("fa-IR")}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* محتوا */}
      <div className="flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <FiLoader className="animate-spin text-indigo-400" size={24} />
          </div>
        ) : tab === "media" ? (
          media?.length ? (
            <div className="grid grid-cols-3 gap-1 p-2">
              {media.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onOpenImage(resolveSrc(m.image))}
                  className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100 dark:bg-gray-800"
                  title={`${m.senderName} • ${faDayLabel(m.createdAt)}`}
                >
                  {m.imageBlur ? (
                    <img
                      src={resolveSrc(m.imageBlur)}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 transition-transform duration-150 group-hover:scale-125"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <FiImage size={20} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FiImage size={34} />}
              text="هنوز عکسی در این گفتگو نیست"
            />
          )
        ) : tab === "links" ? (
          links?.length ? (
            <div className="space-y-0.5 p-2">
              {links.map((l, i) => (
                <a
                  key={`${l.id}-${i}`}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors duration-150"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                    <FiLink size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {extractDomain(l.url)}
                    </p>
                    <p
                      dir="ltr"
                      className="text-[11px] text-gray-400 text-right truncate"
                    >
                      {l.url}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {l.senderName} • {faDayLabel(l.createdAt)} ساعت{" "}
                      {faTime(l.createdAt)}
                    </p>
                  </div>
                  <FiExternalLink
                    size={15}
                    className="text-gray-300 dark:text-gray-600 shrink-0"
                  />
                </a>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FiLink size={34} />}
              text="هنوز لینکی در این گفتگو نیست"
            />
          )
        ) : (
          <EmptyState
            icon={<FiFileText size={34} />}
            text="هنوز فایلی در این گفتگو نیست"
          />
        )}
      </div>
    </aside>
  );
}
