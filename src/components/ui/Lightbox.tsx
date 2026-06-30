"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen image viewer. Opens in place; fits to the screen by default and
 * toggles to a large 1:1-ish zoom on click (scrollable). Esc / backdrop close.
 */
export function Lightbox({
  src,
  name,
  open,
  onClose,
}: {
  src: string | null;
  name?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setZoom(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, src]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-auto overscroll-contain bg-black/85 p-4 backdrop-blur-sm"
        >
          {/* toolbar */}
          <div className="fixed right-4 top-4 z-10 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoom((z) => !z);
              }}
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
              aria-label={zoom ? "Kichraytirish" : "Kattalashtirish"}
              title={zoom ? "Kichraytirish" : "Kattalashtirish"}
            >
              {zoom ? (
                <ZoomOut className="h-5 w-5" />
              ) : (
                <ZoomIn className="h-5 w-5" />
              )}
            </button>
            <a
              href={src}
              download={name}
              onClick={(e) => e.stopPropagation()}
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
              aria-label="Yuklab olish"
              title="Yuklab olish"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
              aria-label="Yopish"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <motion.img
            key={src}
            src={src}
            alt={name || ""}
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => !z);
            }}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className={cn(
              "my-auto rounded-lg shadow-2xl",
              zoom
                ? "max-h-none w-[min(1600px,170vw)] max-w-none cursor-zoom-out"
                : "max-h-[90vh] max-w-[94vw] cursor-zoom-in object-contain"
            )}
          />

          {name && !zoom && (
            <p className="fixed bottom-5 left-1/2 z-10 max-w-[80vw] -translate-x-1/2 truncate rounded-lg bg-black/55 px-3 py-1.5 text-[12px] font-medium text-white/90 backdrop-blur">
              {name}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
