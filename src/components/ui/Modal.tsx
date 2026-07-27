"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  footer,
  onDropFiles,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  /** When set, files dropped anywhere over the dialog are handed here. */
  onDropFiles?: (files: File[]) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // reset the drag overlay whenever the dialog closes
  useEffect(() => {
    if (!open) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }, [open]);

  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes("Files");

  const dragProps = onDropFiles
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!hasFiles(e)) return;
          dragDepth.current += 1;
          setDragging(true);
        },
        onDragOver: (e: React.DragEvent) => {
          if (hasFiles(e)) e.preventDefault();
        },
        onDragLeave: () => {
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setDragging(false);
          }
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length) onDropFiles(files);
        },
      }
    : {};

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            {...dragProps}
            className={cn(
              "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-lift sm:max-w-lg sm:rounded-3xl",
              className
            )}
          >
            <AnimatePresence>
              {onDropFiles && dragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-t-3xl border-2 border-dashed border-accent bg-surface/85 backdrop-blur-sm sm:rounded-3xl"
                >
                  <motion.span
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent shadow-glow-accent"
                  >
                    <UploadCloud className="h-7 w-7" strokeWidth={1.9} />
                  </motion.span>
                  <span className="text-sm font-semibold text-ink">
                    Fayllarni shu yerga tashlang
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 pb-4 pt-5">
                <div>
                  {title && (
                    <h2 className="font-display text-lg font-semibold text-ink">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-muted">{description}</p>
                  )}
                </div>
                <IconButton label="Close" onClick={onClose} className="-mr-1">
                  <X className="h-[18px] w-[18px]" />
                </IconButton>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-border bg-bg/40 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
