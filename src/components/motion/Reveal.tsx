"use client";

import { motion, Variants } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

/** Fade-up an element the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ease, delay }}
    >
      {children}
    </motion.div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { ease } },
};

/**
 * Staggered reveal container. Wrap StaggerItem children.
 * Animates on mount so content is always revealed (no viewport dependency,
 * which previously could leave lists stuck invisible).
 */
export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  /** kept for backwards-compatibility; no longer changes behaviour */
  inView?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
