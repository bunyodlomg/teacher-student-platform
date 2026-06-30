"use client";

import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

type Variant =
  | "primary"
  | "glow"
  | "secondary"
  | "ghost"
  | "danger"
  | "subtle";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-soft hover:shadow-glow-accent hover:brightness-[1.05] active:brightness-95",
  glow: "relative overflow-hidden bg-accent-gradient bg-[length:200%_200%] text-accent-ink shadow-glow-accent hover:shadow-glow-lg animate-gradient-x",
  secondary:
    "bg-surface/80 text-ink border border-border backdrop-blur hover:bg-elevated hover:border-accent/30 shadow-xs hover:shadow-soft",
  subtle: "bg-accent-soft text-accent hover:brightness-105",
  ghost: "text-muted hover:text-ink hover:bg-elevated",
  danger: "bg-danger text-white hover:brightness-110 shadow-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
};

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
);
Button.displayName = "Button";

export const IconButton = forwardRef<
  HTMLButtonElement,
  HTMLMotionProps<"button"> & { label: string }
>(({ className, label, children, ...props }, ref) => (
  <motion.button
    ref={ref}
    aria-label={label}
    title={label}
    whileTap={{ scale: 0.92 }}
    className={cn(
      "grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-ink",
      className
    )}
    {...props}
  >
    {children}
  </motion.button>
));
IconButton.displayName = "IconButton";
