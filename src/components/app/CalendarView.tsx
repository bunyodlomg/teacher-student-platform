"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const WEEK = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const pad = (n: number) => String(n).padStart(2, "0");
const key = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export interface CalEvent {
  id: string;
  title: string;
  date: string; // ISO
  href?: string;
  meta?: string;
}

export function CalendarView({ events }: { events: CalEvent[] }) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string>(
    key(today.getFullYear(), today.getMonth(), today.getDate())
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const d = new Date(e.date);
      const k = key(d.getFullYear(), d.getMonth(), d.getDate());
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [events]);

  const first = new Date(view.y, view.m, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const shift = (delta: number) =>
    setView((v) => {
      const m = v.m + delta;
      return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });

  const selectedEvents = byDay.get(selected) ?? [];
  const isToday = (d: number) =>
    today.getFullYear() === view.y &&
    today.getMonth() === view.m &&
    today.getDate() === d;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-card lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">
            {MONTHS[view.m]} {view.y}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView({ y: today.getFullYear(), m: today.getMonth() })}
              className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-muted hover:bg-elevated"
            >
              Bugun
            </button>
            <button
              onClick={() => shift(1)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-faint">
          {WEEK.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />;
            const k = key(view.y, view.m, d);
            const evs = byDay.get(k) ?? [];
            const isSel = selected === k;
            return (
              <button
                key={i}
                onClick={() => setSelected(k)}
                className={cn(
                  "flex min-h-[64px] flex-col items-start gap-1 rounded-xl border p-1.5 text-left transition-colors",
                  isSel
                    ? "border-accent/50 bg-accent-soft"
                    : "border-border hover:bg-elevated"
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-md text-[12px] font-semibold",
                    isToday(d) ? "bg-accent text-accent-ink" : "text-ink"
                  )}
                >
                  {d}
                </span>
                <span className="flex w-full flex-col gap-0.5">
                  {evs.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      className="truncate rounded bg-accent/15 px-1 py-0.5 text-[10px] font-medium text-accent"
                    >
                      {e.title}
                    </span>
                  ))}
                  {evs.length > 2 && (
                    <span className="px-1 text-[10px] text-faint">
                      +{evs.length - 2}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* selected day list */}
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <p className="eyebrow mb-3">Tanlangan kun</p>
        {selectedEvents.length === 0 ? (
          <p className="text-[14px] text-muted">Bu kunda topshiriq yo'q.</p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((e) => {
              const body = (
                <motion.div
                  whileHover={{ x: 2 }}
                  className="rounded-xl border border-border bg-bg/40 p-3"
                >
                  <p className="text-[13px] font-semibold text-ink">{e.title}</p>
                  {e.meta && (
                    <p className="mt-0.5 text-[12px] text-muted">{e.meta}</p>
                  )}
                </motion.div>
              );
              return e.href ? (
                <Link key={e.id} href={e.href}>
                  {body}
                </Link>
              ) : (
                <div key={e.id}>{body}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
