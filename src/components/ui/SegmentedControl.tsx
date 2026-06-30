"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface Segment {
  value: string;
  label: string;
  count?: number;
}

export function SegmentedControl({
  segments,
  value,
  onChange,
  className,
}: {
  segments: Segment[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-elevated/60 p-1",
        className
      )}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink"
            )}
          >
            {active && (
              <motion.span
                layoutId="segment-active"
                className="absolute inset-0 rounded-lg bg-surface shadow-soft"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {s.label}
              {s.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px]",
                    active ? "bg-accent-soft text-accent" : "bg-bg text-faint"
                  )}
                >
                  {s.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
