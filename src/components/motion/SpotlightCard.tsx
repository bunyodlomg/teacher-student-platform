"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useRef } from "react";

/**
 * Card surface with a cursor-following radial spotlight + hover lift.
 * react-bits style "SpotlightCard".
 */
export function SpotlightCard({
  children,
  className,
  spotlight = "rgb(var(--accent) / 0.10)",
  lift = true,
}: {
  children: React.ReactNode;
  className?: string;
  spotlight?: string;
  lift?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  };

  const background = useMotionTemplate`radial-gradient(240px circle at ${x}px ${y}px, ${spotlight}, transparent 72%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      whileHover={lift ? { y: -3 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn("group relative overflow-hidden", className)}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
