"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  FiMessageCircle,
  FiUsers,
  FiSearch,
  FiPlus,
  FiCheck,
  FiEdit3,
  FiSettings,
  FiLogOut,
  FiLoader,
  FiX,
} from "react-icons/fi";
import Logo from "./Logo";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import SearchUserModal from "./SearchUserModal";
import EditProfileModal from "./EditProfileModal";
import SettingsModal from "./SettingsModal";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { formatListTime } from "@/lib/format";
import CreateGroupModal from "./CreateGroupModal";
import Dropdown from "./Dropdown";
import {
  setCachedChat,
  prefetchChat,
  appendCachedMessage,
  clearCachedMessages,
  removeCachedChat,
} from "@/lib/chatCache";

/* ── اجزای کوچک ── */

function CenterSpinner() {
  return (
    <div className="flex justify-center py-16">
      <FiLoader className="animate-spin text-indigo-400" size={28} />
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 px-8 py-14 text-gray-400 dark:text-gray-500">
      {icon}
      <p className="font-bold text-sm text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p className="text-xs leading-5">{sub}</p>
    </div>
  );
}

function ConversationItem({ conv, active, online, typing, onClick, onHover }) {
  const p = conv.partner;
  const lm = conv.lastMessage;

  let preview = "گفتگو را شروع کنید...";
  if (lm) {
    const prefix = lm.isMine
      ? "شما: "
      : conv.isGroup && lm.senderName
        ? `${lm.senderName}: `
        : "";
    preview = prefix + lm.text;
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      onTouchStart={onHover}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-colors duration-150 ${
        active
          ? "bg-indigo-50 dark:bg-indigo-950/40"
          : "hover:bg-gray-100 dark:hover:bg-gray-800/70"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar
          src={conv.isGroup ? conv.avatar : p?.avatar}
          name={conv.isGroup ? conv.name : p?.displayName || p?.username}
          userId={conv.isGroup ? conv.id : p?.id}
          size={48}
        />
        {!conv.isGroup && online && (
          <span className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-950" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-bold text-sm truncate ${active ? "text-indigo-600 dark:text-indigo-300" : ""}`}
          >
            {conv.isGroup
              ? conv.name
              : p?.displayName || p?.username || "کاربر"}
          </span>
          {lm && (
            <span className="text-[11px] text-gray-400 shrink-0">
              {formatListTime(lm.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {typing ? (
            <span className="flex-1 text-xs font-bold text-indigo-500 truncate">
              در حال نوشتن...
            </span>
          ) : (
            <>
              {lm?.isMine &&
                (lm.seen ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-cyan-500"
                  >
                    <path d="M2 13l4 4L14 9" />
                    <path d="M10 13l4 4L22 9" />
                  </svg>
                ) : (
                  <FiCheck
                    size={14}
                    className="shrink-0 text-gray-400 dark:text-gray-500"
                  />
                ))}
              <p className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                {preview}
              </p>
            </>
          )}
          {conv.unread > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center">
              {conv.unread > 99 ? "۹۹+" : conv.unread.toLocaleString("fa-IR")}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function UserItem({ user, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors duration-150 disabled:opacity-60"
    >
      <Avatar
        src={user.avatar}
        name={user.displayName || user.username}
        userId={user.id}
        size={48}
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">
          {user.displayName || user.username}
        </p>
        <p
          dir="ltr"
          className="text-xs text-gray-400 text-right truncate mt-0.5"
        >
          @{user.username}
        </p>
      </div>
      {loading ? (
        <FiLoader className="animate-spin text-indigo-500" size={18} />
      ) : (
        <FiMessageCircle
          className="text-gray-300 dark:text-gray-600"
          size={18}
        />
      )}
    </button>
  );
}

/* ── سایدبار اصلی ── */

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { socket, onlineIds } = useSocket();
  const router = useRouter();
  const pathname = usePathname();

  const [tab, setTab] = useState("chats");
  const [query, setQuery] = useState("");
  const [convs, setConvs] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [typingMap, setTypingMap] = useState({}); // conversationId -> در حال تایپ؟
  const [fabOpen, setFabOpen] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const convsRef = useRef(convs);
  const typingTimeoutsRef = useRef({});
  convsRef.current = convs;

  const loadConvs = useCallback(() => {
    setConvLoading(true);
    api
      .get("/api/conversations")
      .then((d) => setConvs(d.conversations))
      .catch(() => {})
      .finally(() => setConvLoading(false));
  }, []);

  useEffect(() => {
    loadConvs();
  }, [loadConvs]);

  /* ── گرم‌کردن کش: پیش‌بارگیری گفتگوهای بالای لیست ── */
  useEffect(() => {
    if (convLoading || tab !== "chats" || convs.length === 0) return;
    const t = setTimeout(() => {
      convs.slice(0, 4).forEach((c) => prefetchChat(c.id));
    }, 800);
    return () => clearTimeout(t);
  }, [convs, convLoading, tab]);
  useEffect(() => {
    try {
      const total = convs.reduce((s, c) => s + (c.unread || 0), 0);
      if ("setAppBadge" in navigator) {
        if (total > 0) navigator.setAppBadge(total);
        else navigator.clearAppBadge();
      }
    } catch {}
  }, [convs]);
  /* ── رویدادهای زنده سایدبار ── */
  useEffect(() => {
    if (!socket) return;
    const meId = user?.id;
    const notify = (conversationId, message) => {
      try {
        if (
          !("Notification" in window) ||
          Notification.permission !== "granted"
        )
          return;
        const conv = convsRef.current.find((c) => c.id === conversationId);
        if (!conv || conv.muted) return; // احترام به بی‌صدا کردن
        const watching =
          !document.hidden && pathname === `/chat/${conversationId}`;
        if (watching) return; // خودش دارد چت را می‌بیند

        const title = conv.isGroup
          ? `${message.sender?.displayName || "گروه"} • ${conv.name}`
          : message.sender?.displayName || "پیام جدید";
        const body = message.deleted
          ? "این پیام حذف شده است"
          : message.type === "image"
            ? message.text
              ? `📷 ${message.text}`
              : "📷 عکس"
            : message.text;

        const n = new Notification(title, {
          body,
          icon: "/icons/icon.svg",
          tag: `gapino-${conversationId}`,
        });
        n.onclick = () => {
          window.focus();
          router.push(`/chat/${conversationId}`);
          n.close();
        };
      } catch {}
    };
    const onNew = ({ conversationId, message }) => {
      appendCachedMessage(conversationId, message, meId);
      const isMine = message.sender?.id === meId;
      if (!isMine) notify(conversationId, message);
      const viewing = pathname === `/chat/${conversationId}`;
      setConvs((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) return prev;
        const c = prev[idx];
        const rest = prev.filter((_, i) => i !== idx);
        return [
          {
            ...c,
            unread: isMine || viewing ? c.unread : (c.unread || 0) + 1,
            lastMessage: {
              text: message.deleted
                ? "این پیام حذف شده است"
                : message.type === "image"
                  ? message.text
                    ? `📷 ${message.text}`
                    : "📷 عکس"
                  : message.text,
              createdAt: message.createdAt,
              isMine,
              seen: false,
              senderName: message.sender?.displayName || "",
            },
          },
          ...rest,
        ];
      });
    };

    const onNewConv = ({ conversation }) => {
      setConvs((prev) =>
        prev.some((c) => c.id === conversation.id)
          ? prev
          : [conversation, ...prev],
      );
    };

    const onConvUpdated = ({ conversation }) => {
      setConvs((prev) =>
        prev.map((c) =>
          c.id === conversation.id ? { ...c, pinned: conversation.pinned } : c,
        ),
      );
    };

    // خوانده شدن: تعداد خوانده‌نشده صفر شود
    const onRead = ({ conversationId }) => {
      setConvs((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
      );
    };

    // سین شدن آخرین پیام من (تیک در لیست)
    const onSeen = ({ conversationId, at }) => {
      const t = new Date(at).getTime();
      setConvs((prev) =>
        prev.map((c) => {
          if (
            c.id !== conversationId ||
            !c.lastMessage?.isMine ||
            c.lastMessage.seen
          )
            return c;
          if (new Date(c.lastMessage.createdAt).getTime() <= t) {
            return { ...c, lastMessage: { ...c.lastMessage, seen: true } };
          }
          return c;
        }),
      );
    };

    // پاک شدن تاریخچه
    const onCleared = ({ conversationId }) => {
      clearCachedMessages(conversationId);
      setConvs((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: null, unread: 0, pinned: null }
            : c,
        ),
      );
    };

    // حذف گفتگو
    const onDeleted = ({ conversationId }) => {
      removeCachedChat(conversationId);
      setConvs((prev) => prev.filter((c) => c.id !== conversationId));
      if (pathname === `/chat/${conversationId}`) router.push("/");
    };

    socket.on("message:seen", onSeen);
    socket.on("conversation:cleared", onCleared);
    socket.on("conversation:deleted", onDeleted);

    // «در حال نوشتن» برای هر گفتگو
    const onTyping = ({ conversationId, isTyping }) => {
      setTypingMap((prev) => ({ ...prev, [conversationId]: isTyping }));
      clearTimeout(typingTimeoutsRef.current[conversationId]);
      if (isTyping) {
        // محافظ: اگر رویداد قطع شدن گم شد، بعد از ۳ ثانیه خودکار پاک شود
        typingTimeoutsRef.current[conversationId] = setTimeout(() => {
          setTypingMap((prev) => ({ ...prev, [conversationId]: false }));
        }, 3000);
      }
    };

    socket.on("message:new", onNew);
    socket.on("conversation:new", onNewConv);
    socket.on("conversation:updated", onConvUpdated);
    socket.on("conversation:read", onRead);
    socket.on("typing", onTyping);

    return () => {
      socket.off("message:new", onNew);
      socket.off("conversation:new", onNewConv);
      socket.off("conversation:updated", onConvUpdated);
      socket.off("conversation:read", onRead);
      socket.off("typing", onTyping);
      socket.off("message:seen", onSeen);
      socket.off("conversation:cleared", onCleared);
      socket.off("conversation:deleted", onDeleted);
    };
  }, [socket, user?.id, pathname]);

  // پاکسازی تایمرهای تایپ هنگام unmount
  useEffect(
    () => () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    },
    [],
  );

  // جستجوی کاربران (تب کاربران) با debounce
  useEffect(() => {
    if (tab !== "users") return;
    const t = setTimeout(() => {
      setUsersLoading(true);
      api
        .get(`/api/users?q=${encodeURIComponent(query.trim())}`)
        .then((d) => setUsersList(d.users))
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [tab, query]);

  const filteredConvs = convs.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const n =
      `${c.partner?.displayName || ""} ${c.partner?.username || ""}`.toLowerCase();
    return n.includes(q);
  });

  const startConversation = async (userId) => {
    if (startingId) return;
    setStartingId(userId);
    try {
      const d = await api.post("/api/conversations", { userId });
      loadConvs();
      router.push(`/chat/${d.conversation.id}`);
    } catch {}
    setStartingId(null);
  };

  // باز کردن گفتگو: کشِ لحظه‌ای برای هدر + صفر کردن بج
  const openConversation = (conv) => {
    setConvs((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)),
    );
    setCachedChat(conv.id, { conv });
    router.push(`/chat/${conv.id}`);
  };

  const profileMenu = [
    {
      icon: <FiEdit3 size={18} />,
      label: "ویرایش حساب کاربری",
      action: () => setEditModal(true),
    },
    {
      icon: <FiSettings size={18} />,
      label: "تنظیمات",
      action: () => setSettingsModal(true),
    },
    {
      icon: <FiLogOut size={18} />,
      label: "خروج از حساب",
      danger: true,
      action: logout,
    },
  ];

  return (
    <div className="relative flex flex-col h-full">
      {/* ── هدر ── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          <Logo size={30} />
          {convLoading ? (
            <span className="text-sm text-gray-400 animate-pulse">
              در حال بروزرسانی...
            </span>
          ) : (
            <span className=" text-lg font-extrabold bg-gradient-to-l from-indigo-500 to-cyan-500 bg-clip-text text-transparent text-gray-900 dark:text-white">
              گپینو
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full ring-2 ring-transparent hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all duration-150"
            aria-label="منوی حساب"
          >
            <Avatar
              src={user?.avatar}
              name={user?.displayName}
              userId={user?.id}
              size={36}
            />
          </button>
        </div>
      </header>

      {/* ── منوی پروفایل ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Dropdown
        open={menuOpen}
        className="absolute top-14 left-4 z-40 w-64 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl py-2"
      >
        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 mb-1">
          <p className="font-bold text-sm truncate">{user?.displayName}</p>
          <p dir="ltr" className="text-xs text-gray-400 text-right mt-0.5">
            @{user?.username}
          </p>
        </div>
        {profileMenu.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              setMenuOpen(false);
              item.action();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
              item.danger
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </Dropdown>

      {/* ── تب‌ها ── */}
      <div className="flex gap-1 mx-4 mt-3 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        {[
          {
            key: "chats",
            label: "گفتگوها",
            icon: <FiMessageCircle size={15} />,
          },
          { key: "users", label: "کاربران", icon: <FiUsers size={15} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setQuery("");
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-300"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── جستجو ── */}
      <div className="px-4 mt-3">
        <div className="relative">
          <FiSearch
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={17}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "chats" ? "جستجو در گفتگوها" : "جستجوی کاربران..."
            }
            className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 py-2.5 pr-10 pl-4 text-sm placeholder:text-gray-400 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition duration-150"
          />
        </div>
      </div>

      {/* ── لیست ── */}
      <div className="flex-1 overflow-y-auto px-2 py-2 pb-24">
        {tab === "chats" ? (
          convLoading ? (
            <CenterSpinner />
          ) : filteredConvs.length === 0 ? (
            <EmptyState
              icon={<FiMessageCircle size={36} />}
              title="هنوز گفتگویی نداری"
              sub="با دکمه‌ی پایین صفحه، کاربر جدیدی را با ایمیل یا آیدی پیدا کن و اولین گفتگو را شروع کن."
            />
          ) : (
            filteredConvs.map((c) => (
              <ConversationItem
                key={c.id}
                conv={c}
                online={onlineIds.has(c.partner?.id)}
                typing={!!typingMap[c.id]}
                active={pathname === `/chat/${c.id}`}
                onClick={() => openConversation(c)}
                onHover={() => prefetchChat(c.id)}
              />
            ))
          )
        ) : usersLoading ? (
          <CenterSpinner />
        ) : usersList.length === 0 ? (
          <EmptyState
            icon={<FiUsers size={36} />}
            title="کاربری یافت نشد"
            sub="عبارت دیگری را جستجو کن."
          />
        ) : (
          usersList.map((u) => (
            <UserItem
              key={u.id}
              user={u}
              loading={startingId === u.id}
              onClick={() => startConversation(u.id)}
            />
          ))
        )}
      </div>

      {fabOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />
      )}
      <Dropdown
        open={fabOpen}
        className="absolute bottom-24 left-5 z-30 w-52 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl py-1.5"
      >
        <button
          onClick={() => {
            setFabOpen(false);
            setSearchModal(true);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
        >
          <FiMessageCircle size={18} /> گفتگوی جدید
        </button>
        <button
          onClick={() => {
            setFabOpen(false);
            setGroupModal(true);
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
        >
          <FiUsers size={18} /> گروه جدید
        </button>
      </Dropdown>
      <button
        onClick={() => setFabOpen((v) => !v)}
        className="absolute bottom-5 left-5 z-20 w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg flex items-center justify-center transition-all duration-150 hover:bg-indigo-700 active:scale-95"
        aria-label="گفتگو یا گروه جدید"
      >
        {fabOpen ? <FiX size={24} /> : <FiPlus size={26} />}
      </button>

      <CreateGroupModal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        onCreated={(conv) => {
          loadConvs();
          router.push(`/chat/${conv.id}`);
        }}
      />

      <SearchUserModal
        open={searchModal}
        onClose={() => setSearchModal(false)}
        onStarted={loadConvs}
      />
      <EditProfileModal open={editModal} onClose={() => setEditModal(false)} />
      <SettingsModal
        open={settingsModal}
        onClose={() => setSettingsModal(false)}
      />
    </div>
  );
}
