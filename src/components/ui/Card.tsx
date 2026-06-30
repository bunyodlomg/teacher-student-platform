"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export function Card({
  className,
  interactive,
  glass,
  children,
  ...props
}: HTMLMotionProps<"div"> & { interactive?: boolean; glass?: boolean }) {
  return (
    <motion.div
      className={cn(
        "relative rounded-2xl",
        glass
          ? "glass-card border border-border/70"
          : "border border-border bg-surface shadow-card",
        interactive &&
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-glow-accent",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
