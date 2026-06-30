"use client";

import { Assignment } from "@/lib/types";
import { cn, dueLabel } from "@/lib/utils";
import { getGroup, submissionFor, effectiveStatus } from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Monogram } from "../ui/Monogram";
import { StatusBadge } from "../ui/StatusBadge";

const toneClasses = {
  ok: "text-muted",
  soon: "text-warning",
  over: "text-danger",
};

export function AssignmentCard({
  assignment,
  index = 0,
}: {
  assignment: Assignment;
  index?: number;
}) {
  const userId = useSession((s) => s.currentUserId)!;
  const groups = useData((s) => s.groups);
  const submissions = useData((s) => s.submissions);

  const group = getGroup(groups, assignment.groupId);
  const sub = submissionFor(submissions, assignment.id, userId);
  const status = effectiveStatus(sub);
  const due = dueLabel(assignment.dueDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/student/assignments/${assignment.id}`}
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1 origin-top scale-y-0 rounded-r-full bg-accent transition-transform duration-300 group-hover:scale-y-100" />
        <Monogram label={group?.subject ?? group?.name ?? "?"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] text-faint">{group?.name}</p>
          </div>
          <p className="truncate font-medium text-ink">{assignment.title}</p>
          <div className="mt-1 flex items-center gap-3">
            <span className={cn("text-[12px] font-medium", toneClasses[due.tone])}>
              {due.label}
            </span>
            <span className="text-[12px] text-faint">{assignment.points} ball</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={status} />
          <ArrowUpRight className="h-4 w-4 text-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
        </div>
      </Link>
    </motion.div>
  );
}
