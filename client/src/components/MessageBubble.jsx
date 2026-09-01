"use client";

import { useState } from "react";
import {
  FiClock,
  FiCheck,
  FiLoader,
  FiMoreVertical,
  FiDownload,
} from "react-icons/fi";
import { faTime } from "@/lib/format";
import Avatar from "./Avatar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function resolveSrc(src) {
  if (!src) return "";
  return src.startsWith("http") ||
    src.startsWith("blob:") ||
    src.startsWith("data:")
    ? src
    : `${API_URL}${src}`;
}

function SeenTick({ seen }) {
  if (seen) {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-cyan-300"
      >
        <path d="M2 13l4 4L14 9" />
        <path d="M10 13l4 4L22 9" />
      </svg>
    );
  }
  return <FiCheck size={12} />;
}

function BlurImg({ blur }) {
  if (!blur)
    return <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />;
  return (
    <img
      src={resolveSrc(blur)}
      alt=""
      draggable={false}
      className="absolute inset-0 w-full h-full object-cover"
      style={{ filter: "blur(14px)", transform: "scale(1.15)" }}
    />
  );
}

export default function MessageBubble({
  msg,
  isMine,
  isGroup,
  highlighted,
  onBubbleClick,
  onQuoteClick,
  onImageClick,
}) {
  // عکسِ خودم خودکار نمایش داده می‌شود؛ عکسِ دیگران اول تار است و با کلیک لود می‌شود
  const [requested, setRequested] = useState(isMine);
  const [imgLoaded, setImgLoaded] = useState(false);

  if (msg.deleted) {
    return (
      <div
        id={`msg-${msg.id}`}
        className={`flex ${isMine ? "justify-start" : "justify-end"} px-3`}
      >
        <div className="max-w-[75%] sm:max-w-[65%] rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-xs italic text-gray-400 dark:text-gray-500">
          این پیام حذف شده است
        </div>
      </div>
    );
  }

  const isImage = msg.type === "image" && !!msg.image;
  const hasCaption = !!(msg.text && msg.text.trim());
  const showSender = isGroup && !isMine;
  const needsBubble = !isImage || hasCaption || showSender;

  // عرض ثابت → تراز درست راست/چپ و بدون پرش لِی‌اوت
  const W = "w-[270px] sm:w-[310px] max-w-[85%]";

  const aspect =
    msg.imageWidth && msg.imageHeight
      ? {
          aspectRatio: `${msg.imageWidth} / ${msg.imageHeight}`,
          maxHeight: 420,
        }
      : { minHeight: 180 };

  const timeContent = (
    <>
      {msg.pending ? (
        <FiClock size={11} />
      ) : (
        <>
          {isMine && <SeenTick seen={msg.seen} />}
          {faTime(msg.createdAt)}
        </>
      )}
    </>
  );

  const menuBtn = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onBubbleClick?.(e);
      }}
      className="absolute top-1.5 left-1.5 z-10 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-[2px] hover:bg-black/60 transition-colors duration-150"
      aria-label="منوی پیام"
    >
      <FiMoreVertical size={14} />
    </button>
  );

  const QuoteChip = ({ inBubble }) =>
    msg.replyTo ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuoteClick(msg.replyTo.id);
        }}
        className={`mb-1.5 w-full text-right rounded-lg border-r-2 px-2 py-1 ${
          inBubble
            ? isMine
              ? "border-white/70 bg-white/10"
              : "border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40"
            : isMine
              ? "border-white/60 bg-indigo-600/90"
              : "border-indigo-400 bg-white/90 dark:bg-gray-800/90"
        }`}
      >
        <span
          className={`block text-[11px] font-bold ${inBubble && isMine ? "text-indigo-100" : "text-indigo-500"}`}
        >
          {msg.replyTo.senderName}
        </span>
        <span
          className={`block text-[11px] truncate ${inBubble && isMine ? "text-indigo-100/80" : "text-gray-500 dark:text-gray-400"}`}
        >
          {msg.replyTo.deleted ? "پیام حذف شده" : msg.replyTo.text || "📷 عکس"}
        </span>
      </button>
    ) : null;

  /* ── پیام عکس ── */
  if (isImage) {
    const radius = needsBubble ? "rounded-xl" : "rounded-2xl";

    const placeholderBox = (
      <div
        className={`relative overflow-hidden ${radius} ${highlighted ? "message-highlight" : ""}`}
        style={aspect}
        onContextMenu={(e) => {
          e.preventDefault();
          onBubbleClick?.(e);
        }}
      >
        <BlurImg blur={msg.imageBlur} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRequested(true);
          }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/30 hover:bg-black/40 transition-colors duration-150 text-white"
        >
          <FiDownload size={26} />
          <span className="text-[11px] font-bold drop-shadow">
            برای مشاهده کلیک کنید
          </span>
        </button>
        {menuBtn}
      </div>
    );

    const loadedBox = (
      <div
        className={`relative overflow-hidden ${radius} ${highlighted ? "message-highlight" : ""}`}
        style={aspect}
        onContextMenu={(e) => {
          e.preventDefault();
          onBubbleClick?.(e);
        }}
      >
        {/* تا لود شدن، نسخه تار زیر تصویر اصلی است */}
        {!imgLoaded && <BlurImg blur={msg.imageBlur} />}
        <img
          src={resolveSrc(msg.image)}
          alt=""
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          onClick={(e) => {
            e.stopPropagation();
            if (!msg.pending) onImageClick?.(resolveSrc(msg.image));
          }}
          className={`relative w-full h-full object-cover transition-opacity duration-200 ${
            imgLoaded || msg.pending ? "opacity-100" : "opacity-0"
          }`}
        />
        {msg.pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <FiLoader className="animate-spin text-white" size={26} />
          </div>
        )}
        {!msg.pending && !imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <FiLoader className="animate-spin text-white" size={24} />
          </div>
        )}
        {/* ساعت و تیک روی عکس (فقط وقتی کپشن ندارد) */}
        {!hasCaption && !msg.pending && imgLoaded && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-1.5 right-2 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-[2px]"
          >
            {isMine && <SeenTick seen={msg.seen} />}
            {faTime(msg.createdAt)}
          </div>
        )}
        {menuBtn}
      </div>
    );

    /* بدون قاب: عکس لختِ گوشه‌گرد (خصوصی بدون کپشن، یا عکس خودم در گروه) */
    if (!needsBubble) {
      return (
        <div
          id={`msg-${msg.id}`}
          className={`flex ${isMine ? "justify-start" : "justify-end"} px-3`}
        >
          <div className={`${W} ${msg.pending ? "opacity-70" : ""}`}>
            <QuoteChip inBubble={false} />
            {requested ? loadedBox : placeholderBox}
          </div>
        </div>
      );
    }

    /* با قالب پیام: کپشن دارد، یا عکس دیگران در گروه */
    return (
      <div
        id={`msg-${msg.id}`}
        className={`flex ${isMine ? "justify-start" : "justify-end"} px-3`}
      >
        <div
          onClick={onBubbleClick}
          onContextMenu={(e) => {
            e.preventDefault();
            onBubbleClick?.(e);
          }}
          className={`${W} rounded-2xl p-1.5 cursor-pointer transition-shadow duration-150 ${
            isMine
              ? "rounded-br-md bg-gradient-to-l from-indigo-500 to-indigo-600 text-white"
              : "rounded-bl-md bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700"
          } ${highlighted ? "message-highlight" : ""} ${msg.pending ? "opacity-70" : ""}`}
        >
          {showSender && (
            <div className="mb-1 flex items-center gap-1.5 px-1 pt-0.5">
              <Avatar
                src={msg.sender?.avatar}
                name={msg.sender?.displayName}
                userId={msg.sender?.id}
                size={18}
              />
              <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-300">
                {msg.sender?.displayName}
              </span>
            </div>
          )}
          <QuoteChip inBubble />
          {requested ? loadedBox : placeholderBox}
          {hasCaption && (
            <div className="flex items-end gap-2 px-1 pt-1.5">
              <p className="flex-1 text-sm leading-6 whitespace-pre-wrap break-words">
                {msg.text}
              </p>
              <span
                className={`flex items-center gap-1 shrink-0 pb-0.5 text-[10px] ${
                  isMine ? "text-indigo-100/80" : "text-gray-400"
                }`}
              >
                {msg.editedAt && <span>ویرایش شده</span>}
                {timeContent}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── پیام متنی ── */
  return (
    <div
      id={`msg-${msg.id}`}
      className={`flex ${isMine ? "justify-start" : "justify-end"} px-3`}
    >
      <div
        onClick={onBubbleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onBubbleClick?.(e);
        }}
        className={`max-w-[80%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 cursor-pointer transition-shadow duration-150 ${
          isMine
            ? "rounded-br-md bg-gradient-to-l from-indigo-500 to-indigo-600 text-white"
            : "rounded-bl-md bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 backdrop-blur-[1px]"
        } ${highlighted ? "message-highlight" : ""} ${msg.pending ? "opacity-70" : ""}`}
      >
        {showSender && (
          <div className="mb-1 flex items-center gap-1.5">
            <Avatar
              src={msg.sender?.avatar}
              name={msg.sender?.displayName}
              userId={msg.sender?.id}
              size={18}
            />
            <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-300">
              {msg.sender?.displayName}
            </span>
          </div>
        )}
        <QuoteChip inBubble />
        <div className="flex items-end gap-2">
          <p className="text-sm leading-6 whitespace-pre-wrap break-words">
            {msg.text}
          </p>
          <span
            className={`flex items-center gap-1 shrink-0 pb-0.5 text-[10px] ${
              isMine ? "text-indigo-100/80" : "text-gray-400"
            }`}
          >
            {msg.editedAt && <span>ویرایش شده</span>}
            {timeContent}
          </span>
        </div>
      </div>
    </div>
  );
}
