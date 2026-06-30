import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-7 w-7 text-[13px] rounded-md",
  md: "h-10 w-10 text-base rounded-lg",
  lg: "h-12 w-12 text-lg rounded-lg",
  xl: "h-16 w-16 text-2xl rounded-xl",
};

/**
 * Editorial type-specimen monogram — replaces emoji with a serif initial.
 * Quietly crafted, never childish.
 */
export function Monogram({
  label,
  size = "md",
  className,
  accent,
}: {
  label: string;
  size?: keyof typeof sizes;
  className?: string;
  accent?: boolean;
}) {
  const ch = (label?.trim()?.[0] ?? "·").toUpperCase();
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center border font-display font-medium leading-none",
        accent
          ? "border-accent/25 bg-accent-soft text-accent"
          : "border-border bg-elevated text-ink",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {ch}
    </span>
  );
}
