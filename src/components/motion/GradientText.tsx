"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/** Heading text with a slowly drifting accent gradient. */
export function GradientText({
  children,
  className,
  duration = 6,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}) {
  return (
    <motion.span
      className={cn(
        "inline-block bg-gradient-to-r from-accent via-accent-2 to-accent bg-clip-text text-transparent",
        className
      )}
      style={{ backgroundSize: "200% auto" }}
      animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
      transition={{ duration, ease: "linear", repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
}
