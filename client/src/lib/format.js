export function faTime(dateStr) {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatListTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return faTime(dateStr);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "دیروز";
  return new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "short",
  }).format(d);
}

// برچسب روز برای جداکننده‌ی تاریخ بین پیام‌ها
export function faDayLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "امروز";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "دیروز";
  const opts = { day: "numeric", month: "long" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return new Intl.DateTimeFormat("fa-IR", opts).format(d);
}

// متن زیر نام کاربر در هدر چت
export function formatLastSeen(dateStr) {
  if (!dateStr) return "آخرین بازدید به تازگی";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;

  if (diff < 60) return "آخرین بازدید لحظاتی پیش";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `آخرین بازدید ${m.toLocaleString("fa-IR")} دقیقه پیش`;
  }
  if (d.toDateString() === now.toDateString())
    return `آخرین بازدید امروز ساعت ${faTime(dateStr)}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString())
    return "آخرین بازدید دیروز";

  return `آخرین بازدید ${new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "long",
  }).format(d)}`;
}
