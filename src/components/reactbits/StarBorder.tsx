"use client";

import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";
import { forwardRef } from "react";

/**
 * react-bits "Star Border" — two soft glints orbit the border of a pill.
 * Used as a premium button shell.
 */
export const StarBorder = forwardRef<
  HTMLButtonElement,
  Omit<HTMLMotionProps<"button">, "children"> & {
    color?: string;
    speed?: string;
    children?: React.ReactNode;
    innerClassName?: string;
  }
>(
  (
    {
      className,
      innerClassName,
      color = "rgb(var(--accent))",
      speed = "5s",
      children,
      ...props
    },
    ref
  ) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative inline-block overflow-hidden rounded-2xl p-[1.5px]",
        className
      )}
      {...props}
    >
      <span
        className="absolute bottom-[-12px] right-[-250%] z-0 h-1/2 w-[300%] animate-star-bottom rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <span
        className="absolute left-[-250%] top-[-12px] z-0 h-1/2 w-[300%] animate-star-top rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <span
        className={cn(
          "relative z-10 block rounded-[15px] border border-border bg-surface px-5 py-2.5 text-center text-[15px] font-semibold text-ink",
          innerClassName
        )}
      >
        {children}
      </span>
    </motion.button>
  )
);
StarBorder.displayName = "StarBorder";
