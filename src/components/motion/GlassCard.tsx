"use client";

import { cn } from "@/lib/utils";
import {
  HTMLMotionProps,
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import { useRef } from "react";

/**
 * Frosted glass surface with a cursor-following accent spotlight, a gradient
 * hairline that lights up on hover, and an optional lift. The signature
 * Aurora-Glass card.
 */
export function GlassCard({
  children,
  className,
  lift = true,
  glow = true,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  lift?: boolean;
  glow?: boolean;
} & Omit<HTMLMotionProps<"div">, "children">) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set(e.clientX - r.left);
    y.set(e.clientY - r.top);
  };
  const spot = useMotionTemplate`radial-gradient(300px circle at ${x}px ${y}px, rgb(var(--accent) / 0.14), transparent 70%)`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      whileHover={lift ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn(
        "group glass-card relative overflow-hidden rounded-2xl border border-border/70",
        glow && "transition-shadow hover:shadow-glow-accent",
        className
      )}
      {...rest}
    >
      {/* cursor spotlight */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spot }}
      />
      {/* gradient hairline that brightens on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          padding: 1,
          background:
            "linear-gradient(135deg, rgb(var(--accent) / 0.5), rgb(var(--accent-2) / 0.25), transparent 60%)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
