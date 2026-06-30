"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const WEEK = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** A styled calendar date picker (replaces the bare <input type="date">). */
export function DatePicker({
  value,
  onChange,
  placeholder = "Sanani tanlang",
  className,
}: {
  value: string; // yyyy-mm-dd or ""
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  const [view, setView] = useState(() => {
    const d = selected ?? today;
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const first = new Date(view.y, view.m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isSel = (d: number) =>
    selected &&
    selected.getFullYear() === view.y &&
    selected.getMonth() === view.m &&
    selected.getDate() === d;
  const isToday = (d: number) =>
    today.getFullYear() === view.y &&
    today.getMonth() === view.m &&
    today.getDate() === d;

  const shift = (delta: number) =>
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });

  const label = selected
    ? `${selected.getDate()} ${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`
    : placeholder;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-bg/50 px-3.5 text-left text-sm text-ink transition-colors hover:border-accent/40 focus:border-accent/50 focus:outline-none focus:ring-4 focus:ring-accent/10"
      >
        <Calendar className="h-4 w-4 shrink-0 text-faint" />
        <span className={cn("flex-1 truncate", !selected && "text-faint")}>
          {label}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            className="absolute z-50 mt-2 w-72 rounded-2xl border border-border bg-surface p-3 shadow-lift"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shift(-1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[14px] font-semibold text-ink">
                {MONTHS[view.m]} {view.y}
              </span>
              <button
                type="button"
                onClick={() => shift(1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-faint">
              {WEEK.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) =>
                d === null ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(iso(view.y, view.m, d));
                      setOpen(false);
                    }}
                    className={cn(
                      "grid h-9 place-items-center rounded-lg text-[13px] font-medium transition-colors",
                      isSel(d)
                        ? "bg-accent text-accent-ink shadow-glow-accent"
                        : isToday(d)
                        ? "border border-accent/40 text-accent"
                        : "text-ink hover:bg-elevated"
                    )}
                  >
                    {d}
                  </button>
                )
              )}
            </div>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="mt-2 w-full rounded-lg py-1.5 text-[12px] font-medium text-muted hover:bg-elevated"
              >
                Tozalash
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
