"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { FiLoader, FiZoomIn, FiRotateCw } from "react-icons/fi";
import Modal from "./Modal";

const ASPECTS = [
  { label: "۱:۱", value: 1 },
  { label: "۴:۳", value: 4 / 3 },
  { label: "۱۶:۹", value: 16 / 9 },
  { label: "۳:۴", value: 3 / 4 },
];

/* ── ابزارهای برش ── */

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

function getRadianAngle(deg) {
  return (deg * Math.PI) / 180;
}

function rotateSize(width, height, rotation) {
  const rot = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rot) * width) + Math.abs(Math.sin(rot) * height),
    height: Math.abs(Math.sin(rot) * width) + Math.abs(Math.cos(rot) * height),
  };
}

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const box = rotateSize(image.width, image.height, rotation);
  canvas.width = box.width;
  canvas.height = box.height;

  ctx.translate(box.width / 2, box.height / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(0, 0, box.width, box.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    Math.round(0 - box.width / 2 + image.width / 2 - pixelCrop.x),
    Math.round(0 - box.height / 2 + image.height / 2 - pixelCrop.y),
  );

  return canvas;
}

function scaleCanvas(canvas, maxDim) {
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  if (scale === 1) return canvas;
  const next = document.createElement("canvas");
  next.width = Math.round(canvas.width * scale);
  next.height = Math.round(canvas.height * scale);
  next.getContext("2d").drawImage(canvas, 0, 0, next.width, next.height);
  return next;
}

/* ── مودال ── */

export default function ImageCropModal({ src, onCancel, onConfirm }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(4 / 3);
  const [caption, setCaption] = useState("");
  const [processing, setProcessing] = useState(false);
  const areaRef = useRef(null);

  // با هر عکس جدید، همه‌چیز ریست شود
  useEffect(() => {
    if (src) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCaption("");
      setProcessing(false);
    }
  }, [src]);

  const onCropComplete = useCallback((_, px) => {
    areaRef.current = px;
  }, []);

  const confirm = async () => {
    if (!areaRef.current || processing) return;
    setProcessing(true);
    try {
      const canvas = await getCroppedImg(src, areaRef.current, rotation);
      const final = scaleCanvas(canvas, 1600);
      const blob = await new Promise((r) =>
        final.toBlob(r, "image/jpeg", 0.85),
      );

      // تامبنیل ۲۴ پیکسلی برای حالت تارِ گیرنده
      const blurCanvas = scaleCanvas(canvas, 24);
      const blur = blurCanvas.toDataURL("image/jpeg", 0.5);

      onConfirm({
        blob,
        width: final.width,
        height: final.height,
        caption: caption.trim(),
        blur,
      });
    } catch {
      onCancel();
    }
  };

  return (
    <Modal open={!!src} onClose={onCancel} title="ویرایش عکس">
      <div className="relative h-[280px] sm:h-[320px] rounded-2xl overflow-hidden bg-gray-900">
        {src && (
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid
          />
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <FiZoomIn className="shrink-0 text-gray-400" size={18} />
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <FiRotateCw className="shrink-0 text-gray-400" size={18} />
        <input
          type="range"
          min={0}
          max={360}
          step={5}
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        {ASPECTS.map((a) => (
          <button
            key={a.label}
            onClick={() => setAspect(a.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 ${
              aspect === a.value
                ? "bg-indigo-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* کپشن */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium">کپشن (اختیاری)</label>
          <span className="text-[11px] text-gray-400">
            {caption.length.toLocaleString("fa-IR")}/۱۰۰۰
          </span>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 1000))}
          rows={2}
          maxLength={1000}
          placeholder="متنی برای نمایش زیر عکس بنویس..."
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2.5 px-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition duration-150"
        />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
        >
          انصراف
        </button>
        <button
          onClick={confirm}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-indigo-500 to-cyan-500 py-2.5 text-sm font-bold text-white transition duration-200 hover:opacity-90 disabled:opacity-60"
        >
          {processing && <FiLoader className="animate-spin" size={16} />}
          ارسال عکس
        </button>
      </div>
    </Modal>
  );
}
