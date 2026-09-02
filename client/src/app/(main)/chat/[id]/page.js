"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FiArrowRight,
  FiLoader,
  FiCornerUpLeft,
  FiEdit2,
  FiCopy,
  FiBookmark,
  FiTrash2,
  FiX,
  FiMessageSquare,
  FiAlertCircle,
  FiMoreVertical,
  FiBellOff,
  FiBell,
  FiSearch,
  FiXCircle,
  FiUsers,
  FiLogOut,
} from "react-icons/fi";
import Avatar from "@/components/Avatar";
import MessageBubble from "@/components/MessageBubble";
import ChatInput from "@/components/ChatInput";
import ConfirmModal from "@/components/ConfirmModal";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { formatLastSeen, faDayLabel, faTime } from "@/lib/format";
import ImageCropModal from "@/components/ImageCropModal";
import Lightbox from "@/components/Lightbox";
import { uploadFile } from "@/lib/api";
import GroupInfoModal from "@/components/GroupInfoModal";
import ChatProfilePanel from "@/components/ChatProfilePanel";
import { getCachedChat } from "@/lib/chatCache";
import Dropdown from "@/components/Dropdown";
import { createPortal } from "react-dom";
import { useSlideNav } from "@/context/SlideNavContext";
function DateChip({ label }) {
  return (
    <div className="flex justify-center py-3">
      <span className="rounded-full bg-gray-200/70 dark:bg-gray-800 px-3 py-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}

export default function ChatPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, onlineIds } = useSocket();
  const router = useRouter();

  const [showProfile, setShowProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [menu, setMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [partnerTyping, setPartnerTyping] = useState(false);

  // ── منوی چت ──
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(false);

  // ── جستجوی پیام ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const scrollRef = useRef(null);
  const stickBottomRef = useRef(true);
  const restoreRef = useRef(null);
  const prevLenRef = useRef(0);
  const initialScrollRef = useRef(false);
  const lastReadRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingSentRef = useRef(false);
  const typingClearRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const hasNewerRef = useRef(false);
  const newerLoadingRef = useRef(false);

  const { startExit } = useSlideNav();

  useEffect(() => {
    hasNewerRef.current = hasNewer;
  }, [hasNewer]);

  /* ── لود اولیه (با کش: باز شدن فوری) ── */
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    initialScrollRef.current = false;
    setConv(null);
    setMessages([]);
    setHasMore(false);
    setHasNewer(false);
    setPartnerTyping(false);
    setReplyTo(null);
    setEditing(null);
    setHighlightId(null);
    setChatMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults(null);

    // ۱) اگر از سایدبار آمده‌ایم، همه‌چیز همین حالا هست!
    const cached = getCachedChat(id);
    if (cached?.conv) {
      setConv(cached.conv);
      setMuted(!!cached.conv.muted);
    }
    if (cached?.messages) {
      setMessages(cached.messages);
      setHasMore(!!cached.hasMore);
      setLoading(false);
      return; // پیش‌بارگیری‌شده و تازه — نیازی به fetch نیست
    }

    // ۲) ورود مستقیم با URL: fetch موازی (نصف زمان قبلی)
    try {
      const [convD, msgD] = await Promise.all([
        api.get(`/api/conversations/${id}`),
        api.get(`/api/messages/${id}?limit=30`),
      ]);
      setConv(convD.conversation);
      setMuted(!!convD.conversation.muted);
      setMessages(msgD.messages);
      setHasMore(msgD.hasMore);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  /* ── اسکرول اولیه به پایین ── */
  useEffect(() => {
    if (loading || initialScrollRef.current) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      stickBottomRef.current = true;
      prevLenRef.current = messages.length;
      initialScrollRef.current = true;
    }
  }, [loading, messages]);

  /* ── چسبیدن به پایین هنگام پیام جدید ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (messages.length > prevLenRef.current && stickBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages]);
  /* ── حفظ موقعیت پایین هنگام باز/بسته شدن کیبورد موبایل ── */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const el = scrollRef.current;
        if (el && stickBottomRef.current) el.scrollTop = el.scrollHeight;
      }, 120);
    };
    vv.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      vv.removeEventListener("resize", onResize);
    };
  }, []);
  /* ── ثبت «خوانده شدن» پیام‌های طرف مقابل ── */
  useEffect(() => {
    if (!conv || loading || !socket) return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    )
      return;
    const lastIncoming = [...messages]
      .reverse()
      .find((m) => !m.pending && m.sender?.id !== user?.id);
    if (lastIncoming && lastReadRef.current !== lastIncoming.id) {
      lastReadRef.current = lastIncoming.id;
      socket.emit("read", { conversationId: id });
    }
  }, [messages, conv, loading, socket, id, user?.id]);

  /* ── لود پیام‌های قدیمی‌تر ── */
  const loadOlder = async () => {
    if (!hasMore || loadingOlder || loading || messages.length === 0) return;
    const el = scrollRef.current;
    restoreRef.current = { height: el.scrollHeight, top: el.scrollTop };
    setLoadingOlder(true);
    try {
      const oldest = messages[0]?.createdAt;
      const d = await api.get(
        `/api/messages/${id}?limit=30&before=${encodeURIComponent(oldest)}`,
      );
      setMessages((prev) => [...d.messages, ...prev]);
      setHasMore(d.hasMore);
    } catch {}
    setLoadingOlder(false);
  };

  useEffect(() => {
    if (loadingOlder) return;
    const r = restoreRef.current;
    if (r && scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight - r.height + r.top;
      restoreRef.current = null;
    }
  }, [messages, loadingOlder]);

  /* ── لود پیام‌های جدیدتر (بعد از پرش به گذشته) ── */
  const loadNewer = async () => {
    if (
      !hasNewerRef.current ||
      newerLoadingRef.current ||
      loading ||
      messages.length === 0
    )
      return;
    newerLoadingRef.current = true;
    try {
      const newest = messages[messages.length - 1]?.createdAt;
      const d = await api.get(
        `/api/messages/${id}?limit=30&after=${encodeURIComponent(newest)}`,
      );
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const fresh = d.messages.filter((m) => !known.has(m.id));
        return [...prev, ...fresh];
      });
      setHasNewer(d.hasNewer);
    } catch {}
    newerLoadingRef.current = false;
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickBottomRef.current = distanceToBottom < 120;
    if (el.scrollTop < 80) loadOlder();
    if (distanceToBottom < 80 && hasNewerRef.current) loadNewer();
  };

  /* ── گوش دادن به رویدادهای زنده ── */
  useEffect(() => {
    if (!socket || !conv) return;
    const cid = conv.id;
    const meId = user.id;

    const onNew = ({ conversationId, message }) => {
      if (conversationId !== cid) return;
      if (message.sender?.id === meId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          const cleaned = [...prev];
          const idx = cleaned.findIndex(
            (m) =>
              m.pending && m.text === message.text && m.sender?.id === meId,
          );
          if (idx !== -1) cleaned.splice(idx, 1);
          return [...cleaned, message];
        });
      } else if (hasNewerRef.current) {
        // اگر در گذشته‌ی گفتگو هستیم، به‌جای ایجاد شکاف، جدیدترها را لود کن
        loadNewer();
      } else {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message],
        );
        socket.emit("read", { conversationId: cid });
      }
    };

    const onSeen = ({ conversationId, at }) => {
      if (conversationId !== cid) return;
      const t = new Date(at).getTime();
      setMessages((prev) =>
        prev.map((m) =>
          m.sender?.id === meId &&
          !m.pending &&
          new Date(m.createdAt).getTime() <= t
            ? { ...m, seen: true }
            : m,
        ),
      );
    };

    const onUpdated = ({ conversationId, message }) => {
      if (conversationId !== cid) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m)),
      );
    };

    const onDeleted = ({ conversationId, messageId }) => {
      if (conversationId !== cid) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, deleted: true, text: "", editedAt: null }
            : m,
        ),
      );
    };

    const onTyping = ({ conversationId, userId, isTyping }) => {
      if (conversationId !== cid || userId === meId) return;
      setPartnerTyping(isTyping);
      if (isTyping) {
        clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(
          () => setPartnerTyping(false),
          3000,
        );
      }
    };

    const onPresence = ({ userId: uid, online, lastSeen }) => {
      setConv((prev) => {
        if (!prev?.partner || prev.partner.id !== uid) return prev;
        if (online) return prev;
        return {
          ...prev,
          partner: {
            ...prev.partner,
            lastSeen: lastSeen || prev.partner.lastSeen,
          },
        };
      });
    };

    const onConvUpdated = ({ conversation }) => {
      if (conversation.id !== cid) return;
      setConv((prev) =>
        prev
          ? {
              ...prev,
              pinned: conversation.pinned,
              name: conversation.name,
              avatar: conversation.avatar,
              membersCount: conversation.membersCount,
              adminId: conversation.adminId,
            }
          : prev,
      );
    };

    // پاک شدن تاریخچه (توسط هرکدام از دو طرف)
    const onCleared = ({ conversationId }) => {
      if (conversationId !== cid) return;
      setMessages([]);
      setHasMore(false);
      setHasNewer(false);
      stickBottomRef.current = true;
    };

    // حذف گفتگو (توسط طرف مقابل) → خروج از صفحه
    const onConvDeleted = ({ conversationId }) => {
      if (conversationId !== cid) return;
      goBack();
    };

    socket.on("message:new", onNew);
    socket.on("message:seen", onSeen);
    socket.on("message:updated", onUpdated);
    socket.on("message:deleted", onDeleted);
    socket.on("typing", onTyping);
    socket.on("presence", onPresence);
    socket.on("conversation:updated", onConvUpdated);
    socket.on("conversation:cleared", onCleared);
    socket.on("conversation:deleted", onConvDeleted);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:seen", onSeen);
      socket.off("message:updated", onUpdated);
      socket.off("message:deleted", onDeleted);
      socket.off("typing", onTyping);
      socket.off("presence", onPresence);
      socket.off("conversation:updated", onConvUpdated);
      socket.off("conversation:cleared", onCleared);
      socket.off("conversation:deleted", onConvDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, conv?.id, user?.id]);

  /* ── «در حال نوشتن» خودم (با ضربان هر ۱.۲ ثانیه) ── */
  const handleInputChange = (value) => {
    setInput(value);
    if (!socket) return;
    if (value.trim()) {
      const now = Date.now();
      if (!typingSentRef.current || now - lastTypingEmitRef.current > 1200) {
        typingSentRef.current = true;
        lastTypingEmitRef.current = now;
        socket.emit("typing", { conversationId: id, isTyping: true });
      }
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingSentRef.current = false;
      socket.emit("typing", { conversationId: id, isTyping: false });
    }, 1800);
  };

  useEffect(
    () => () => {
      clearTimeout(typingTimerRef.current);
      clearTimeout(typingClearRef.current);
    },
    [],
  );

  /* ── ارسال / ویرایش ── */
  const doSend = async () => {
    const text = input.trim();
    if (!text) return;

    const isEdit = !!editing;
    setInput("");
    setError("");

    clearTimeout(typingTimerRef.current);
    if (typingSentRef.current && socket) {
      typingSentRef.current = false;
      socket.emit("typing", { conversationId: id, isTyping: false });
    }

    try {
      if (isEdit) {
        const d = await api.put(`/api/messages/${editing.id}`, { text });
        setMessages((prev) =>
          prev.map((m) => (m.id === d.message.id ? d.message : m)),
        );
        setEditing(null);
      } else {
        const temp = {
          id: `temp-${Date.now()}`,
          pending: true,
          sender: { id: user.id, displayName: user.displayName },
          text,
          type: "text",
          deleted: false,
          editedAt: null,
          replyTo: replyTo ? { ...replyTo, deleted: false } : null,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, temp]);
        setReplyTo(null);
        const d = await api.post("/api/messages", {
          conversationId: id,
          text,
          replyTo: temp.replyTo?.id ?? null,
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === temp.id ? d.message : m)),
        );
      }
    } catch (e) {
      if (!isEdit) setMessages((prev) => prev.filter((m) => !m.pending));
      setInput(text);
      setError(e.message);
    }
  };

  /* ── ارسال عکس (بعد از کراپ + کپشن) ── */
  const onCropConfirm = async ({ blob, width, height, caption, blur }) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    const localUrl = URL.createObjectURL(blob);
    const temp = {
      id: `temp-${Date.now()}`,
      pending: true,
      sender: { id: user.id, displayName: user.displayName },
      text: caption,
      type: "image",
      image: localUrl,
      imageWidth: width,
      imageHeight: height,
      imageBlur: blur,
      deleted: false,
      editedAt: null,
      replyTo: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);
    try {
      const fd = new FormData();
      fd.append("image", blob, "photo.jpg");
      const up = await uploadFile("/api/uploads/image", fd);
      const d = await api.post("/api/messages", {
        conversationId: id,
        type: "image",
        text: caption,
        image: up.url,
        imagePublicId: up.publicId,
        imageWidth: width,
        imageHeight: height,
        imageBlur: blur,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === temp.id ? d.message : m)),
      );
      URL.revokeObjectURL(localUrl);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setError(e.message);
    }
  };

  /* ── پرش نرم به پیام ── */
  const scrollToMessage = (mid) => {
    const el = document.getElementById(`msg-${mid}`);
    if (!el) {
      setError(
        "این پیام در پیام‌های بارگذاری‌شده نیست. کمی به بالا اسکرول کن.",
      );
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(mid);
    setTimeout(() => setHighlightId(null), 1300);
  };
  /* ── بازگشت با انیمیشن خروج (موبایل) ── */
  const goBack = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      router.push("/");
      return;
    }
    startExit();
    setTimeout(() => router.push("/"), 260);
  };
  const copyText = async (t) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {}
  };

  /* ── عملیات منوی چت ── */
  const toggleMute = async () => {
    try {
      const d = await api.put(`/api/conversations/${id}/mute`, {
        muted: !muted,
      });
      setMuted(d.muted);
    } catch (e) {
      setError(e.message);
    }
  };

  const doClearHistory = async () => {
    setConfirmClear(false);
    try {
      await api.delete(`/api/conversations/${id}/history`);
      setMessages([]);
      setHasMore(false);
      setHasNewer(false);
      setConv((prev) =>
        prev ? { ...prev, pinned: null, lastMessage: null } : prev,
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const doDeleteConv = async () => {
    setConfirmDeleteConv(false);
    try {
      await api.delete(`/api/conversations/${id}`);
      goBack();
    } catch (e) {
      setError(e.message);
    }
  };

  const doLeaveGroup = async () => {
    setConfirmLeave(false);
    try {
      await api.post(`/api/groups/${id}/leave`);
      goBack();
    } catch (e) {
      setError(e.message);
    }
  };

  /* ── جستجوی پیام ── */
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults(null);
  };

  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .get(`/api/messages/${id}/search?q=${encodeURIComponent(q)}`)
        .then((d) => setSearchResults(d.results))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, searchOpen, id]);

  const jumpToSearchResult = async (mid) => {
    closeSearch();
    if (document.getElementById(`msg-${mid}`)) {
      scrollToMessage(mid);
      return;
    }
    try {
      const d = await api.get(`/api/messages/${id}?limit=30&around=${mid}`);
      setMessages(d.messages);
      setHasMore(d.hasMore);
      setHasNewer(d.hasNewer);
      stickBottomRef.current = false;
      setTimeout(() => scrollToMessage(mid), 100);
    } catch (e) {
      setError(e.message);
    }
  };

  /* ── سنجاق ── */
  const togglePin = async (msg) => {
    try {
      const target = conv.pinned?.id === msg.id ? null : msg.id;
      const d = await api.put(`/api/conversations/${id}/pin`, {
        messageId: target,
      });
      setConv(d.conversation);
    } catch (e) {
      setError(e.message);
    }
  };

  const unpin = async () => {
    try {
      const d = await api.put(`/api/conversations/${id}/pin`, {
        messageId: null,
      });
      setConv(d.conversation);
    } catch (e) {
      setError(e.message);
    }
  };

  /* ── حذف پیام ── */
  const doDelete = async () => {
    const msg = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/api/messages/${msg.id}`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, deleted: true, text: "", editedAt: null }
            : m,
        ),
      );
      if (conv.pinned?.id === msg.id) unpin();
    } catch (e) {
      setError(e.message);
    }
  };

  /* ── منوی پیام ── */
  const openMenu = (msg, e) => {
    if (msg.pending) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const W = 190;
    let x = rect.left + rect.width / 2 - W / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - W - 8));
    let y = rect.bottom + 6;
    if (y + 250 > window.innerHeight) y = Math.max(8, rect.top - 256);
    setMenu({ msg, x, y });
  };

  const menuItems = (() => {
    if (!menu?.msg) return [];
    const m = menu.msg;
    const mine = m.sender?.id === user.id;
    const items = [];
    items.push({
      icon: <FiCornerUpLeft size={16} />,
      label: "پاسخ",
      action: () => {
        setEditing(null);
        setReplyTo({
          id: m.id,
          senderName: mine ? "شما" : m.sender?.displayName || "",
          text: m.text || (m.type === "image" ? "عکس" : ""),
        });
      },
    });
    if (m.text)
      items.push({
        icon: <FiCopy size={16} />,
        label: "کپی متن",
        action: () => copyText(m.text),
      });
    if (mine && m.type === "text")
      items.push({
        icon: <FiEdit2 size={16} />,
        label: "ویرایش",
        action: () => {
          setReplyTo(null);
          setEditing(m);
          setInput(m.text);
        },
      });
    items.push({
      icon: <FiBookmark size={16} />,
      label: conv?.pinned?.id === m.id ? "برداشتن سنجاق" : "سنجاق کردن",
      action: () => togglePin(m),
    });
    if (mine)
      items.push({
        icon: <FiTrash2 size={16} />,
        label: "حذف",
        danger: true,
        action: () => setConfirmDelete(m),
      });
    return items;
  })();

  const menuItemsRef = useRef([]);
  if (menu) menuItemsRef.current = menuItems;
  /* ── آیتم‌های منوی چت ── */
  const chatMenuItems = [
    ...(conv?.isGroup
      ? [
          {
            icon: <FiUsers size={16} />,
            label: "اطلاعات گروه",
            action: () => setShowGroupInfo(true),
          },
        ]
      : []),
    {
      icon: muted ? <FiBell size={16} /> : <FiBellOff size={16} />,
      label: muted ? "فعال کردن صدا" : "بی‌صدا کردن اعلان‌ها",
      action: toggleMute,
    },
    {
      icon: <FiSearch size={16} />,
      label: "جستجوی پیام‌ها",
      action: () => {
        setSearchOpen(true);
        setSearchQuery("");
        setSearchResults(null);
      },
    },
    {
      icon: <FiXCircle size={16} />,
      label: "پاک کردن تاریخچه",
      action: () => setConfirmClear(true),
    },
    conv?.isGroup
      ? {
          icon: <FiLogOut size={16} />,
          label: "خروج از گروه",
          danger: true,
          action: () => setConfirmLeave(true),
        }
      : {
          icon: <FiTrash2 size={16} />,
          label: "حذف گفتگو",
          danger: true,
          action: () => setConfirmDeleteConv(true),
        },
  ];

  /* ── رندر ── */

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <FiLoader className="animate-spin text-indigo-400" size={28} />
      </div>
    );
  }

  if (!conv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-gray-400 px-6 text-center">
        <FiMessageSquare size={36} />
        <p>گفتگو یافت نشد</p>
        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl px-4 py-2 max-w-xs">
            {error}
          </p>
        )}
        <div className="flex items-center gap-5">
          <button
            onClick={loadInitial}
            className="text-indigo-500 font-medium hover:text-indigo-600 transition-colors duration-150"
          >
            تلاش مجدد
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-indigo-500 font-medium hover:text-indigo-600 transition-colors duration-150"
          >
            بازگشت به لیست
          </button>
        </div>
      </div>
    );
  }

  const rendered = [];
  let lastDay = null;
  messages.forEach((m) => {
    const day = new Date(m.createdAt).toDateString();
    if (day !== lastDay) {
      rendered.push(
        <DateChip key={`day-${day}`} label={faDayLabel(m.createdAt)} />,
      );
      lastDay = day;
    }
    rendered.push(
      <MessageBubble
        key={m.id}
        msg={m}
        isMine={m.sender?.id === user.id}
        highlighted={highlightId === m.id}
        onBubbleClick={(e) => openMenu(m, e)}
        onQuoteClick={scrollToMessage}
        onImageClick={(url) => setViewer(url)}
        isGroup={!!conv.isGroup}
      />,
    );
  });

  const partner = conv.partner;
  const banner = editing
    ? {
        type: "edit",
        name: "",
        text: editing.text,
        onCancel: () => {
          setEditing(null);
          setInput("");
        },
      }
    : replyTo
      ? {
          type: "reply",
          name: replyTo.senderName,
          text: replyTo.text,
          onCancel: () => setReplyTo(null),
        }
      : null;

  return (
    <div className="relative flex flex-col h-full">
      {/* ── هدر ── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={goBack}
          className="md:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          aria-label="بازگشت"
        >
          <FiArrowRight size={20} />
        </button>
        {partner ? (
          <button
            onClick={() => setShowProfile(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-right"
            aria-label="اطلاعات پروفایل"
          >
            <Avatar
              src={partner.avatar}
              name={partner.displayName}
              userId={partner.id}
              size={40}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm truncate">
                  {partner.displayName}
                </p>
                {muted && (
                  <FiBellOff size={13} className="text-gray-400 shrink-0" />
                )}
              </div>
              <p
                className={`text-[11px] truncate ${
                  partnerTyping
                    ? "text-indigo-500 font-bold"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {partnerTyping
                  ? "در حال نوشتن..."
                  : onlineIds.has(partner.id)
                    ? "آنلاین"
                    : formatLastSeen(partner.lastSeen)}
              </p>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setShowProfile(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-right"
            aria-label="اطلاعات گروه"
          >
            <Avatar
              src={conv.avatar}
              name={conv.name}
              userId={conv.id}
              size={40}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm truncate">{conv.name}</p>
                {muted && (
                  <FiBellOff size={13} className="text-gray-400 shrink-0" />
                )}
              </div>
              <p
                className={`text-[11px] truncate ${
                  partnerTyping
                    ? "text-indigo-500 font-bold"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {partnerTyping
                  ? "در حال نوشتن..."
                  : `${(conv.membersCount || 0).toLocaleString("fa-IR")} عضو`}
              </p>
            </div>
          </button>
        )}
        <button
          onClick={() => setChatMenuOpen((v) => !v)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 shrink-0"
          aria-label="منوی چت"
        >
          <FiMoreVertical size={20} />
        </button>
      </header>

      {/* ── منوی چت ── */}
      {chatMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setChatMenuOpen(false)}
        />
      )}
      <Dropdown
        open={chatMenuOpen}
        className="absolute top-14 left-4 z-50 w-60 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl py-1.5"
      >
        {chatMenuItems.map((it) => (
          <button
            key={it.label}
            onClick={() => {
              setChatMenuOpen(false);
              it.action();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
              it.danger
                ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {it.icon}
            {it.label}
          </button>
        ))}
      </Dropdown>

      {/* ── جستجوی پیام‌ها ── */}
      {searchOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={closeSearch} />
          <div className="absolute top-16 left-2 right-2 z-30 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl p-3 animate-fade-in-up">
            <div className="relative">
              <FiSearch
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در پیام‌ها..."
                className="w-full rounded-xl bg-gray-100 dark:bg-gray-800 py-2 pr-10 pl-9 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition duration-150"
              />
              <button
                onClick={closeSearch}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150"
                aria-label="بستن جستجو"
              >
                <FiX size={14} />
              </button>
            </div>

            {searching && (
              <div className="flex justify-center py-4">
                <FiLoader className="animate-spin text-indigo-400" size={20} />
              </div>
            )}

            {!searching && searchResults?.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">
                نتیجه‌ای یافت نشد
              </p>
            )}

            {!searching && searchResults?.length > 0 && (
              <div className="max-h-64 overflow-y-auto mt-1 space-y-0.5">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => jumpToSearchResult(r.id)}
                    className="w-full text-right px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    <p className="text-sm text-gray-800 dark:text-gray-100 truncate">
                      {r.text}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {faDayLabel(r.createdAt)} • ساعت {faTime(r.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── نوار پیام سنجاق‌شده ── */}
      {conv.pinned && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 shrink-0">
          <FiBookmark className="text-indigo-500 shrink-0" size={16} />
          <button
            onClick={() => scrollToMessage(conv.pinned.id)}
            className="flex-1 min-w-0 text-right"
          >
            <p className="text-[11px] font-bold text-indigo-500">
              پیام سنجاق‌شده
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
              {conv.pinned.deleted ? "پیام حذف شده" : conv.pinned.text}
            </p>
          </button>
          <button
            onClick={unpin}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors duration-150 shrink-0"
            aria-label="برداشتن سنجاق"
          >
            <FiX size={15} />
          </button>
        </div>
      )}

      {/* ── خطا ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400 shrink-0">
          <FiAlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} aria-label="بستن">
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* ── پیام‌ها ── */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="chat-bg flex-1 overflow-y-auto space-y-1 py-2"
      >
        {loadingOlder && (
          <div className="flex justify-center py-3">
            <FiLoader className="animate-spin text-indigo-400" size={20} />
          </div>
        )}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 pt-20 text-gray-400 dark:text-gray-500">
            <FiMessageSquare size={40} />
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
              هنوز پیامی نیست
            </p>
            <p className="text-xs">اولین پیام را بفرست! 👋</p>
          </div>
        ) : (
          rendered
        )}
      </div>

      {/* ── ورودی ── */}
      <div className="shrink-0">
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSend={doSend}
          banner={banner}
          onImageFile={(file) => setCropSrc(URL.createObjectURL(file))}
        />
      </div>

      {/* ── منوی پیام ── */}
      {menu &&
        createPortal(
          <Dropdown
            open={!!menu}
            className="fixed z-50 w-[190px] rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl py-1.5"
            style={{ top: menu.y, left: menu.x }}
          >
            {menuItemsRef.current.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setMenu(null);
                  it.action();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  it.danger
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </Dropdown>,
          document.body,
        )}

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="حذف پیام"
        desc="این پیام برای هر دو طرف حذف می‌شود و قابل بازگشت نیست."
        confirmText="حذف"
        danger
        onConfirm={doDelete}
      />

      <ConfirmModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="پاک کردن تاریخچه"
        desc="تمام پیام‌های این گفتگو برای هر دو طرف برای همیشه پاک می‌شود."
        confirmText="پاک کردن"
        danger
        onConfirm={doClearHistory}
      />

      <ConfirmModal
        open={confirmDeleteConv}
        onClose={() => setConfirmDeleteConv(false)}
        title="حذف گفتگو"
        desc="این گفتگو و تمام پیام‌های آن برای هر دو طرف حذف می‌شود."
        confirmText="حذف گفتگو"
        danger
        onConfirm={doDeleteConv}
      />

      <ImageCropModal
        src={cropSrc}
        onCancel={() => {
          if (cropSrc) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }}
        onConfirm={onCropConfirm}
      />
      <ConfirmModal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="خروج از گروه"
        desc="آیا از خروج از این گروه مطمئنی؟"
        confirmText="خروج"
        danger
        onConfirm={doLeaveGroup}
      />

      <GroupInfoModal
        open={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        conv={conv}
        meId={user.id}
        onLeft={() => goBack()}
      />

      <ChatProfilePanel
        open={showProfile}
        onClose={() => setShowProfile(false)}
        conv={conv}
        onOpenImage={(url) => setViewer(url)}
        onViewGroupInfo={() => setShowGroupInfo(true)}
      />
      <Lightbox src={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}
