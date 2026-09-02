import { api } from "./api";

// ── استور درون‌حافظه‌ای گفتگوها (الگوی Stale-While-Revalidate) ──
const store = new Map(); // id -> { conv?, messages?, hasMore, ts }
const pending = new Set();

export function setCachedChat(id, data) {
  const prev = store.get(id) || {};
  store.set(id, { ...prev, ...data, ts: data.ts ?? prev.ts ?? Date.now() });
}

export function getCachedChat(id) {
  return store.get(id) || null;
}

export function isCacheFresh(id, ms = 15000) {
  const c = store.get(id);
  return !!c && Date.now() - c.ts < ms;
}

export function removeCachedChat(id) {
  store.delete(id);
}

export function clearCachedMessages(id) {
  const c = store.get(id);
  if (!c) return;
  store.set(id, {
    ...c,
    messages: [],
    hasMore: false,
    conv: c.conv ? { ...c.conv, pinned: null, lastMessage: null } : c.conv,
    ts: Date.now(),
  });
}

function lastMessagePreview(message) {
  if (message.type === "image")
    return message.text ? `📷 ${message.text}` : "📷 عکس";
  return message.text;
}

// پیام زنده‌ی سوکت → کش (به‌جای باطل‌کردن کش، تغذیه‌اش می‌کنیم)
export function appendCachedMessage(id, message, myId) {
  const c = store.get(id);
  if (!c) return;
  if ((c.messages || []).some((m) => m.id === message.id)) return;
  store.set(id, {
    ...c,
    messages: [...(c.messages || []), message],
    conv: c.conv
      ? {
          ...c.conv,
          lastMessage: {
            text: lastMessagePreview(message),
            createdAt: message.createdAt,
            isMine: message.sender?.id === myId,
            seen: false,
            senderName: message.sender?.displayName || "",
          },
        }
      : c.conv,
    ts: Date.now(),
  });
}

export function replaceCachedMessage(id, message) {
  const c = store.get(id);
  if (!c) return;
  store.set(id, {
    ...c,
    messages: (c.messages || []).map((m) =>
      m.id === message.id ? message : m,
    ),
    ts: Date.now(),
  });
}

export function markDeletedCachedMessage(id, messageId) {
  const c = store.get(id);
  if (!c) return;
  store.set(id, {
    ...c,
    messages: (c.messages || []).map((m) =>
      m.id === messageId
        ? { ...m, deleted: true, text: "", editedAt: null }
        : m,
    ),
    ts: Date.now(),
  });
}

export function markSeenCachedMessages(id, myId, at) {
  const c = store.get(id);
  if (!c) return;
  const t = new Date(at).getTime();
  store.set(id, {
    ...c,
    messages: (c.messages || []).map((m) =>
      m.sender?.id === myId &&
      !m.pending &&
      new Date(m.createdAt).getTime() <= t
        ? { ...m, seen: true }
        : m,
    ),
  });
}

// ── ادغام نتیجه‌ی fetch با کش (پیام‌های قدیمی‌ترِ لودشده حفظ می‌شوند) ──
export function mergeFetched(id, { messages: fetched, hasMore }) {
  const c = store.get(id);
  const prev = c?.messages || [];
  const fetchedIds = new Set(fetched.map((m) => m.id));
  const oldest = fetched.length ? new Date(fetched[0].createdAt).getTime() : 0;

  // پیام‌های در انتظارِ در حال ارسال حفظ شوند (بدون دوباره‌شدن با نسخه‌ی سرور)
  const temps = prev.filter(
    (m) =>
      m.pending &&
      !fetched.some((f) => f.sender?.id === m.sender?.id && f.text === m.text),
  );

  // اگر فاصله‌ای بین کش و پنجره‌ی fetch باشد، فقط پنجره‌ی تازه معتبر است
  const hasGap = prev.some(
    (m) =>
      !m.pending &&
      !fetchedIds.has(m.id) &&
      new Date(m.createdAt).getTime() >= oldest,
  );

  const prefix = hasGap
    ? []
    : prev.filter(
        (m) =>
          !m.pending &&
          !fetchedIds.has(m.id) &&
          new Date(m.createdAt).getTime() < oldest,
      );

  const messages = hasGap
    ? [...fetched, ...temps]
    : [...prefix, ...fetched, ...temps];
  const nextHasMore = hasGap ? true : prefix.length > 0 ? (c?.hasMore ?? true) : !!hasMore;

  store.set(id, {
    ...(c || {}),
    messages,
    hasMore: nextHasMore,
    ts: Date.now(),
  });
  return { messages, hasMore: nextHasMore };
}
// پیام‌های قدیمی‌ترِ لودشده با اسکرول → در استور ذخیره می‌شوند
export function mergeOlder(id, { messages: fetched, hasMore }) {
  const c = store.get(id);
  const prev = c?.messages || [];
  const fetchedIds = new Set(fetched.map((m) => m.id));

  const older = fetched.filter((m) => !prev.some((p) => p.id === m.id));
  const temps = prev.filter((m) => m.pending); // در انتظارها همیشه آخر
  const base = prev.filter((m) => !m.pending && !fetchedIds.has(m.id));

  const messages = [...older, ...base, ...temps];
  store.set(id, { ...(c || {}), messages, hasMore: !!hasMore, ts: Date.now() });
  return { messages, hasMore: !!hasMore };
}
// ── پیش‌بارگیری / نوسازی پس‌زمینه‌ای (روی hover، لمس و گرم‌کردن کش) ──
export async function prefetchChat(id) {
  if (!id || pending.has(id)) return;
  const c = store.get(id);
  if (c && Date.now() - c.ts < 30000) return; // هنوز تازه است
  pending.add(id);
  try {
    const d = await api.get(`/api/messages/${id}?limit=30`);
    mergeFetched(id, d);
  } catch {
  } finally {
    pending.delete(id);
  }
}
