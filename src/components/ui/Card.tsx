"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export function Card({
  className,
  interactive,
  children,
  ...props
}: HTMLMotionProps<"div"> & { interactive?: boolean }) {
  return (
    <motion.div
      className={cn(
        "relative rounded-2xl border border-border bg-surface shadow-card",
        interactive &&
          "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lift",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
