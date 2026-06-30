"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { Magnetic } from "./Magnetic";

/**
 * Premium gradient CTA: animated accent gradient fill, a sweeping shine, a
 * soft accent glow and a magnetic hover. Use for the single most important
 * action on a screen (login, publish, submit).
 */
export const ShimmerButton = forwardRef<
  HTMLButtonElement,
  Omit<HTMLMotionProps<"button">, "children"> & {
    magnetic?: boolean;
    children?: React.ReactNode;
  }
>(({ className, children, magnetic = true, ...props }, ref) => {
  const btn = (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className={cn(
        "group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent-gradient bg-[length:200%_200%] px-6 text-[15px] font-semibold text-accent-ink shadow-glow-accent transition-shadow animate-gradient-x hover:shadow-glow-lg disabled:opacity-60 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {/* sweeping shine overlay */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      >
        <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 blur-md animate-shine" />
      </span>
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );

  return magnetic ? <Magnetic strength={0.25}>{btn}</Magnetic> : btn;
});
ShimmerButton.displayName = "ShimmerButton";
