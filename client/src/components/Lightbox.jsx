"use client";

import { useEffect } from "react";
import { FiX, FiDownload } from "react-icons/fi";

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors duration-150"
        aria-label="بستن"
      >
        <FiX size={22} />
      </button>
      <a
        href={src}
        download
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors duration-150"
        aria-label="دانلود"
      >
        <FiDownload size={20} />
      </a>
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
      />
    </div>
  );
}
