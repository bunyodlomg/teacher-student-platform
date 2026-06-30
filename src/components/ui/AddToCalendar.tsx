"use client";

import {
  CalendarEvent,
  googleCalendarUrl,
  icsDataUrl,
} from "@/lib/calendar";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** A button that links a deadline to the user's calendar (Google or .ics). */
export function AddToCalendar({
  event,
  className,
}: {
  event: CalendarEvent;
  className?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-[13px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-ink"
      >
        <CalendarPlus className="h-4 w-4" /> Kalendarga
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <>
                <div
                  className="fixed inset-0 z-[90]"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  style={{ top: pos.top, right: pos.right }}
                  className="fixed z-[100] w-52 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lift"
                >
                  <a
                    href={googleCalendarUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-elevated"
                  >
                    <Check className="h-4 w-4 text-accent" /> Google Calendar
                  </a>
                  <a
                    href={icsDataUrl(event)}
                    download={`${event.title}.ics`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-elevated"
                  >
                    <Check className="h-4 w-4 text-accent" /> Apple / Outlook (.ics)
                  </a>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
