"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

/**
 * react-bits "Folder" — a little folder that opens on hover, fanning out its
 * papers. Nice for empty states / section headers.
 */
export function Folder({
  size = 1,
  className,
  papers = 3,
}: {
  size?: number;
  className?: string;
  papers?: number;
}) {
  const [open, setOpen] = useState(false);
  const fans = [
    { x: -22, y: -26, r: -12 },
    { x: 0, y: -34, r: 0 },
    { x: 22, y: -26, r: 12 },
  ];

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ transform: `scale(${size})` }}
      className={cn("relative h-20 w-24 cursor-pointer", className)}
    >
      {/* papers */}
      {Array.from({ length: Math.min(papers, 3) }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={
            open
              ? { x: fans[i].x, y: fans[i].y, rotate: fans[i].r, opacity: 1 }
              : { x: 0, y: -6, rotate: 0, opacity: 0.0 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="absolute left-1/2 top-3 h-14 w-16 -translate-x-1/2 rounded-md border border-border bg-surface shadow-soft"
        />
      ))}
      {/* folder back */}
      <div className="absolute bottom-0 h-16 w-24 rounded-xl rounded-tl-none bg-accent/80" />
      <div className="absolute bottom-[60px] left-0 h-4 w-10 rounded-t-md bg-accent/80" />
      {/* folder front flap */}
      <motion.div
        initial={false}
        animate={open ? { rotateX: -38 } : { rotateX: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        style={{ transformOrigin: "bottom", transformPerspective: 600 }}
        className="absolute bottom-0 h-12 w-24 rounded-xl bg-accent-gradient shadow-lg"
      />
    </div>
  );
}
