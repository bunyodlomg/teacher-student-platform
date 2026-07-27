"use client";

import { useToast, ToastTone } from "@/store/toast";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const meta: Record<
  ToastTone,
  { icon: typeof Info; ring: string; tint: string }
> = {
  success: {
    icon: CheckCircle2,
    ring: "border-success/30",
    tint: "text-success",
  },
  error: { icon: AlertTriangle, ring: "border-danger/30", tint: "text-danger" },
  info: { icon: Info, ring: "border-accent/30", tint: "text-accent" },
};

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:items-end">
      <AnimatePresence>
        {toasts.map((t) => {
          const M = meta[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-lift",
                M.ring
              )}
            >
              <M.icon className={cn("mt-0.5 h-4 w-4 shrink-0", M.tint)} />
              <p className="flex-1 text-[13px] font-medium leading-snug text-ink">
                {t.message}
              </p>
              <button
                onClick={() => dismiss(t.id)}
                className="-mr-1 grid h-5 w-5 shrink-0 place-items-center rounded-md text-faint transition-colors hover:text-ink"
                aria-label="Yopish"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
