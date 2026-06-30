"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/** Soft, slowly drifting gradient blobs sitting behind page content. */
export function Aurora({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden",
        className
      )}
    >
      <motion.div
        className="absolute -left-20 -top-28 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 24, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 -top-24 h-72 w-72 rounded-full bg-accent-2/25 blur-3xl"
        animate={{ x: [0, -36, 0], y: [0, 36, 0], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/3 -top-32 h-64 w-64 rounded-full bg-success/15 blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
