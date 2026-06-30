"use client";

import { Group } from "@/lib/types";
import { getUser } from "@/lib/selectors";
import { useData } from "@/store/data";
import { motion } from "framer-motion";
import { GradientText } from "@/components/motion";
import { AvatarStack } from "../ui/Avatar";
import { Monogram } from "../ui/Monogram";

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
    .filter(Boolean) as { name: string; hue: string }[];

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
        <AvatarStack users={students} size="sm" max={6} />
        <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
          {students.length} o'quvchi
          {teacher && <> · ustoz {teacher.name}</>}
        </span>
      </div>

      <div className="rule mt-6" />
    </motion.div>
  );
}
