"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export default function Modal({ open, onClose, title, children }) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let t;
    if (open) {
      setRender(true);
      setClosing(false);
    } else if (render) {
      setClosing(true);
      t = setTimeout(() => setRender(false), 160);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!render) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${
          closing ? "animate-fade-out" : "animate-fade-in"
        }`}
        onClick={onClose}
      />
      <div
        className={`relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[calc(var(--app-height,100dvh)-32px)] overflow-y-auto ${
          closing ? "animate-modal-out" : "animate-modal-in"
        }`}
      >
        <header className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
            aria-label="بستن"
          >
            <FiX size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}
