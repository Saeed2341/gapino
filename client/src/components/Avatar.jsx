"use client";

import { useMemo } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const GRADIENTS = [
  "from-indigo-500 to-purple-500",
  "from-cyan-500 to-blue-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-fuchsia-500",
];

export default function Avatar({
  src,
  name = "",
  userId = "",
  size = 48,
  className = "",
}) {
  const initial = (name || "؟").trim().charAt(0).toUpperCase();

  const gradient = useMemo(() => {
    let hash = 0;
    for (const ch of userId || name || "")
      hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  }, [userId, name]);

  if (src) {
    const fullSrc = /^(https?:|blob:|data:)/.test(src)
      ? src
      : `${API_URL}${src}`;
    return (
      <img
        src={fullSrc}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold shrink-0 select-none ${className}`}
    >
      {initial}
    </div>
  );
}
