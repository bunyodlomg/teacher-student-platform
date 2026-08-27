"use client";

import { Group, User } from "@/lib/types";
import { getUser } from "@/lib/selectors";
import { useData } from "@/store/data";
import { motion } from "framer-motion";
import { GradientText } from "@/components/motion";
import { Avatar } from "../ui/Avatar";
import { Monogram } from "../ui/Monogram";
import { UserProfileModal } from "./UserProfileModal";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function GroupHero({
  group,
  action,
}: {
  group: Group;
  action?: React.ReactNode;
}) {
  const users = useData((s) => s.users);
  const teacher = getUser(users, group.teacherId);
  const students = group.studentIds
    .map((id) => getUser(users, id))
    .filter(Boolean) as User[];

  const [profile, setProfile] = useState<User | null>(null);

  const MAX = 6;
  const shown = students.slice(0, MAX);
  const extra = students.length - shown.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <div className="flex items-start gap-4">
        <Monogram label={group.subject} size="xl" accent />
        <div className="flex-1 pt-1">
          <p className="eyebrow">{group.subject}</p>
          <h1 className="mt-1.5 font-display text-3xl font-medium tracking-[-0.01em] text-ink sm:text-[34px]">
            <GradientText>{group.name}</GradientText>
          </h1>
        </div>
        {action && <div className="pt-1">{action}</div>}
      </div>

      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        {group.description}
      </p>

      <div className="mt-5 flex items-center gap-4">
        {/* clickable member avatars → open that person's profile */}
        <div className="flex items-center -space-x-2">
          {shown.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setProfile(u)}
              title={u.name}
              className="rounded-full transition-transform hover:z-10 hover:scale-110 focus:z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Avatar user={u} size="sm" ring />
            </button>
          ))}
          {extra > 0 && (
            <div className="relative grid h-8 w-8 place-items-center rounded-full bg-elevated text-xs font-semibold text-muted ring-2 ring-surface">
              +{extra}
            </div>
          )}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
          {students.length} o'quvchi
          {teacher && (
            <>
              {" · ustoz "}
              <button
                type="button"
                onClick={() => setProfile(teacher)}
                className={cn(
                  "font-mono uppercase tracking-wider text-faint underline-offset-2 transition-colors hover:text-accent hover:underline"
                )}
              >
                {teacher.name}
              </button>
            </>
          )}
        </span>
      </div>

      <div className="rule mt-6" />

      <UserProfileModal
        user={profile}
        open={!!profile}
        onClose={() => setProfile(null)}
      />
    </motion.div>
  );
}
