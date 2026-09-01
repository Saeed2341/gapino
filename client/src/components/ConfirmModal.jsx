"use client";

import { FiLoader } from "react-icons/fi";
import Modal from "./Modal";

export default function ConfirmModal({
  open,
  onClose,
  title,
  desc,
  confirmText = "تأیید",
  danger = false,
  loading = false,
  onConfirm,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-6">
        {desc}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
        >
          انصراف
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-colors duration-150 disabled:opacity-60 ${
            danger
              ? "bg-red-500 hover:bg-red-600"
              : "bg-indigo-500 hover:bg-indigo-600"
          }`}
        >
          {loading && <FiLoader className="animate-spin" size={16} />}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
