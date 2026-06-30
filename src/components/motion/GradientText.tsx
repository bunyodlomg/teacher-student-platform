import { cn } from "@/lib/utils";

/** Heading text with a static accent gradient (no continuous animation). */
export function GradientText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  /** kept for backwards-compat; no longer animates */
  duration?: number;
}) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-accent via-accent-2 to-accent-3 bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
