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
      <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-display text-[15px] font-semibold italic leading-none text-accent-ink">
        C
      </span>
      {showWord && (
        <span className="font-display text-[17px] font-medium tracking-tight text-ink">
          Cambridge <span className="text-faint">Learn</span>
        </span>
      )}
    </span>
  );
}
