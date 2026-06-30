"use client";

import { motion } from "framer-motion";
import { GradientText } from "@/components/motion/GradientText";

const ease = [0.16, 1, 0.3, 1] as const;

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  gradient,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** render the title with an animated accent gradient */
  gradient?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease }}
            className="eyebrow mb-2.5"
          >
            {eyebrow}
          </motion.p>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease, delay: 0.05 }}
          className="font-display text-[28px] font-medium leading-[1.08] tracking-[-0.01em] text-ink text-balance sm:text-[34px]"
        >
          {gradient ? <GradientText>{title}</GradientText> : title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, delay: 0.1 }}
            className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted text-pretty"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease, delay: 0.12 }}
          className="flex items-center gap-2"
        >
          {action}
        </motion.div>
      )}
    </div>
  );
}
