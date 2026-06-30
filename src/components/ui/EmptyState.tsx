"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-14 text-center",
        className
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 -z-10 rounded-2xl bg-accent/10 blur-xl" />
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-elevated text-accent">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-muted text-balance">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
