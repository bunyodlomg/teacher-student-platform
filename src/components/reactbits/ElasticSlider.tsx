"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";

/**
 * react-bits "Elastic Slider" — the track squashes/stretches as you grab it,
 * and the fill springs to the value. Controlled (value/onChange).
 */
export function ElasticSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  leftIcon,
  rightIcon,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const pct = useMotionValue(((value - min) / (max - min)) * 100);
  const width = useSpring(pct, { stiffness: 320, damping: 26 });
  const widthStr = useTransform(width, (p) => `${Math.max(0, Math.min(100, p))}%`);
  const scaleY = useSpring(active ? 1.5 : 1, { stiffness: 400, damping: 22 });

  const setFromClientX = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    pct.set(p * 100);
    onChange(Math.round(min + p * (max - min)));
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {leftIcon && <span className="shrink-0 text-faint">{leftIcon}</span>}
      <motion.div
        ref={trackRef}
        style={{ scaleY }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setActive(true);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => active && setFromClientX(e.clientX)}
        onPointerUp={() => setActive(false)}
        onPointerCancel={() => setActive(false)}
        className="relative h-2.5 flex-1 cursor-pointer rounded-full bg-elevated"
      >
        <motion.div
          style={{ width: widthStr }}
          className="absolute inset-y-0 left-0 rounded-full bg-accent-gradient"
        />
        <motion.div
          style={{ left: widthStr }}
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface shadow-soft"
        />
      </motion.div>
      {rightIcon && <span className="shrink-0 text-faint">{rightIcon}</span>}
      <span className="w-9 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}
