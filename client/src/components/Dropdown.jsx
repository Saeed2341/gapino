"use client";

import { useEffect, useRef, useState } from "react";

export default function Dropdown({ open, children, className = "", style }) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const styleRef = useRef(style);
  if (style) styleRef.current = style;

  useEffect(() => {
    let t;
    if (open) {
      setRender(true);
      setClosing(false);
    } else if (render) {
      setClosing(true);
      t = setTimeout(() => setRender(false), 140);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!render) return null;

  return (
    <div
      style={styleRef.current}
      onClick={(e) => e.stopPropagation()}
      className={`${closing ? "animate-dd-out" : "animate-dd-in"} ${className}`}
    >
      {children}
    </div>
  );
}
