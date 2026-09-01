"use client";

import { useRef } from "react";
import { FiSend, FiX, FiCornerUpLeft, FiEdit2, FiImage } from "react-icons/fi";

export default function ChatInput({
  value,
  onChange,
  onSend,
  sending,
  banner,
  onImageFile,
}) {
  const ref = useRef(null);
  const fileRef = useRef(null);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    onImageFile?.(file);
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
      {/* بنر پاسخ / ویرایش */}
      {banner && (
        <div className="flex items-center gap-2 px-4 pt-2.5">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-2">
            {banner.type === "reply" ? (
              <FiCornerUpLeft className="text-indigo-500 shrink-0" size={16} />
            ) : (
              <FiEdit2 className="text-indigo-500 shrink-0" size={16} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-indigo-500">
                {banner.type === "reply"
                  ? `پاسخ به ${banner.name}`
                  : "ویرایش پیام"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {banner.text}
              </p>
            </div>
          </div>
          <button
            onClick={banner.onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
            aria-label="لغو"
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 disabled:opacity-40"
          aria-label="ارسال عکس"
        >
          <FiImage size={20} />
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            grow();
          }}
          onKeyDown={handleKeyDown}
          placeholder="پیام خود را بنویسید..."
          className="flex-1 resize-none rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 max-h-[120px] transition duration-150"
        />
        <button
          onClick={onSend}
          disabled={sending || !value.trim()}
          className="w-11 h-11 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md transition-colors duration-150 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40"
          aria-label="ارسال"
        >
          <FiSend size={18} className="-scale-x-100" />
        </button>
      </div>
    </div>
  );
}
