"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/motion/CountUp";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "accent",
  delay = 0,
  suffix,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "accent" | "success" | "warning" | "danger";
  delay?: number;
  /** appended after a numeric value (e.g. "%") */
  suffix?: string;
}) {
  const tones = {
    accent: "text-accent bg-accent-soft",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/12",
    danger: "text-danger bg-danger/10",
  };
  const glow = {
    accent: "rgb(var(--accent) / 0.12)",
    success: "rgb(var(--success) / 0.12)",
    warning: "rgb(var(--warning) / 0.14)",
    danger: "rgb(var(--danger) / 0.12)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <SpotlightCard
        spotlight={glow[tone]}
        className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift"
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110",
              tones[tone]
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          {hint && (
            <span className="text-[11px] font-medium text-faint">{hint}</span>
          )}
        </div>
        <div className="mt-3 font-display text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {typeof value === "number" ? (
            <CountUp value={value} suffix={suffix} />
          ) : (
            value
          )}
        </div>
        <div className="mt-1.5 text-[13px] text-muted">{label}</div>
      </SpotlightCard>
    </motion.div>
  );
}
