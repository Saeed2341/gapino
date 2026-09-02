import { api } from "./api";

const cache = new Map(); // id -> { conv?, messages?, hasMore?, ts }
const pending = new Set();

export function setCachedChat(id, data) {
  cache.set(id, { ...(cache.get(id) || {}), ...data, ts: Date.now() });
}

export function getCachedChat(id) {
  return cache.get(id) || null;
}

export function invalidateChat(id) {
  cache.delete(id);
}

// پیش‌بارگیری پیام‌ها (hover در دسکتاپ / touch در موبایل — قبل از کلیک)
export async function prefetchChat(id) {
  if (!id || cache.has(id) || pending.has(id)) return;
  pending.add(id);
  try {
    const d = await api.get(`/api/messages/${id}?limit=30`);
    setCachedChat(id, { messages: d.messages, hasMore: d.hasMore });
  } catch {
  } finally {
    pending.delete(id);
  }
}