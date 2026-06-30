"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useRef } from "react";

/**
 * react-bits "Border Glow" — a glow rides the card's border, following the
 * cursor. The fill stays clean; only the 1px rim lights up.
 */
export function GlowCard({
  children,
  className,
  radius = 260,
}: {
  children: React.ReactNode;
  className?: string;
  radius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-radius);
  const y = useMotionValue(-radius);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  };
  const border = useMotionTemplate`radial-gradient(${radius}px circle at ${x}px ${y}px, rgb(var(--accent) / 0.7), transparent 65%)`;

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn("group relative rounded-2xl", className)}
    >
      {/* glowing rim (masked to the 1px border) */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: border,
          padding: 1,
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
