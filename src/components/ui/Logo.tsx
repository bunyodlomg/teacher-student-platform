import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] bg-accent-gradient font-display text-[15px] font-semibold italic leading-none text-accent-ink shadow-glow-accent">
        {/* soft inner sheen */}
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"
        />
        <span className="relative">C</span>
      </span>
      {showWord && (
        <span className="font-display text-[17px] font-medium tracking-tight text-ink">
          Cambridge <span className="text-faint">Learn</span>
        </span>
      )}
    </span>
  );
}
