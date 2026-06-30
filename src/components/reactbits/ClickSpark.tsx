"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";

interface Burst {
  id: number;
  x: number;
  y: number;
}

/**
 * react-bits "Click Spark" — wraps content and emits a radial spark burst at
 * the pointer on each click. Purely decorative; passes clicks through.
 */
export function ClickSpark({
  children,
  className,
  color = "rgb(var(--accent))",
  count = 8,
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  count?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const [bursts, setBursts] = useState<Burst[]>([]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const id = idRef.current++;
    setBursts((b) => [...b, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 500);
  };

  return (
    <div ref={ref} onClick={onClick} className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {bursts.map((b) => (
          <span
            key={b.id}
            className="pointer-events-none absolute z-50"
            style={{ left: b.x, top: b.y }}
          >
            {Array.from({ length: count }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute block h-[2px] w-3 rounded-full"
                style={{
                  background: color,
                  rotate: `${(i / count) * 360}deg`,
                  transformOrigin: "left center",
                }}
                initial={{ opacity: 1, x: 4, scaleX: 0.6 }}
                animate={{ opacity: 0, x: 22, scaleX: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            ))}
          </span>
        ))}
      </AnimatePresence>
    </div>
  );
}
