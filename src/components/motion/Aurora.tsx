import { cn } from "@/lib/utils";

/**
 * Static gradient-mesh wash that reads the role-tinted accent vars. Rendered as
 * plain (non-animated) blurred blobs — painted once, so it adds no continuous
 * GPU/compositing cost. (Previously animated; made static for performance.)
 */
export function Aurora({
  className,
  full = false,
  intensity = 1,
}: {
  className?: string;
  full?: boolean;
  intensity?: number;
}) {
  const blob = "absolute rounded-full blur-2xl";
  const o = (n: number) => Math.min(1, n * intensity);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none overflow-hidden",
        full ? "absolute inset-0 -z-10" : "absolute inset-x-0 top-0 -z-10 h-72",
        className
      )}
    >
      <div
        className={cn(blob, "h-72 w-72 bg-accent")}
        style={{ opacity: o(0.26), left: "-6%", top: full ? "-8%" : "-30%" }}
      />
      <div
        className={cn(blob, "h-72 w-72 bg-accent-2")}
        style={{ opacity: o(0.24), right: "-4%", top: full ? "6%" : "-26%" }}
      />
      {full && (
        <div
          className={cn(blob, "h-64 w-64 bg-accent-3")}
          style={{ opacity: o(0.18), left: "40%", top: "58%" }}
        />
      )}
    </div>
  );
}
