"use client";

import { FiX } from "react-icons/fi";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up">
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
    </div>
  );
}
