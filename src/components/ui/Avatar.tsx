import { cn, initials } from "@/lib/utils";
import { User } from "@/lib/types";

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-2xl",
};

export function Avatar({
  user,
  size = "md",
  className,
  ring,
}: {
  user: Pick<User, "name" | "hue">;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm select-none",
        user.hue,
        sizes[size],
        ring && "ring-2 ring-surface",
        className
      )}
      title={user.name}
    >
      {initials(user.name)}
    </div>
  );
}

export function AvatarStack({
  users,
  size = "sm",
  max = 4,
}: {
  users: Pick<User, "name" | "hue">[];
  size?: keyof typeof sizes;
  max?: number;
}) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((u, i) => (
        <Avatar key={i} user={u} size={size} ring />
      ))}
      {extra > 0 && (
        <div
          className={cn(
            "relative grid place-items-center rounded-full bg-elevated text-muted font-semibold ring-2 ring-surface",
            sizes[size]
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
