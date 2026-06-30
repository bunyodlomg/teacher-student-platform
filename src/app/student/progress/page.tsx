"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Monogram } from "@/components/ui/Monogram";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { StatCard } from "@/components/ui/StatCard";
import { Aurora, Stagger, StaggerItem, SpotlightCard } from "@/components/motion";
import {
  assignmentsForStudent,
  effectiveStatus,
  getGroup,
  getUser,
  groupsForUser,
  studentStats,
  submissionFor,
} from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { relativeTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Flame, Trophy } from "lucide-react";

export default function StudentProgress() {
  const userId = useSession((s) => s.currentUserId)!;
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);
  const assignments = useData((s) => s.assignments);
  const submissions = useData((s) => s.submissions);

  const me = getUser(users, userId)!;
  const stats = studentStats(assignments, groups, submissions, userId);
  const completion = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const myGroups = groupsForUser(groups, userId, "student");

  const perClass = myGroups.map((g) => {
    const list = assignmentsForStudent(assignments, groups, userId).filter(
      (a) => a.groupId === g.id
    );
    const done = list.filter((a) => {
      const s = effectiveStatus(submissionFor(submissions, a.id, userId));
      return s === "submitted" || s === "approved";
    }).length;
    return { group: g, done, total: list.length };
  });

  const graded = submissions
    .filter((s) => s.studentId === userId && s.status === "approved")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <div className="relative">
      <Aurora />
      <PageHeader eyebrow="Natijalar" title="O'qishingiz — mehr bilan o'lchangan" gradient />

      {/* Profil + halqa */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-6 shadow-card lg:col-span-2"
        >
          <Avatar user={me} size="xl" />
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-ink">
              {me.name}
            </h2>
            <p className="text-sm text-muted">{me.headline ?? me.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="warning" dot>
                <Flame className="h-3.5 w-3.5" /> {stats.streak} kun ketma-ket
              </Badge>
              <Badge tone="success" dot>
                {stats.completed} ta bajarilgan
              </Badge>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-6 shadow-card"
        >
          <ProgressRing
            value={completion}
            size={92}
            stroke={9}
            label={`${completion}%`}
            sublabel="bajarildi"
          />
          <div>
            <p className="font-display text-sm font-semibold text-ink">
              Chorak yakuni
            </p>
            <p className="mt-1 text-[13px] text-muted">
              {stats.total} topshiriqdan {stats.completed} tasi topshirilgan.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Statistika */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Trophy} label="O'rtacha baho" value={stats.avgScore ?? "—"} suffix={stats.avgScore !== null ? "%" : undefined} tone="success" delay={0} />
        <StatCard icon={CheckCircle2} label="Bajarilgan" value={stats.completed} tone="accent" delay={0.06} />
        <StatCard icon={Clock} label="Navbatda" value={stats.pending} tone={stats.pending ? "warning" : "success"} delay={0.12} />
        <StatCard icon={Flame} label="Ketma-ketlik" value={stats.streak} suffix=" kun" tone="warning" delay={0.18} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Sinflar bo'yicha */}
        <section>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">
            Guruhlar bo'yicha natija
          </h2>
          <Stagger className="space-y-3" inView>
            {perClass.map(({ group, done, total }) => (
              <StaggerItem key={group.id}>
                <SpotlightCard className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                      <Monogram label={group.subject} size="sm" /> {group.name}
                    </span>
                    <span className="text-[12px] tabular-nums text-faint">
                      {done}/{total}
                    </span>
                  </div>
                  <ProgressBar value={total ? (done / total) * 100 : 0} />
                </SpotlightCard>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* So'nggi baholar */}
        <section>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">
            So'nggi izohlar
          </h2>
          <Stagger className="space-y-3" inView>
            {graded.length === 0 && (
              <p className="text-sm text-muted">Hali baholangan ish yo'q.</p>
            )}
            {graded.map((s) => {
              const a = assignments.find((x) => x.id === s.assignmentId);
              const g = a ? getGroup(groups, a.groupId) : undefined;
              return (
                <StaggerItem key={s.id}>
                <SpotlightCard className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] text-faint">{g?.name}</p>
                      <p className="truncate text-sm font-medium text-ink">
                        {a?.title}
                      </p>
                    </div>
                    <span className="font-display text-lg font-semibold text-success">
                      {s.score}
                      <span className="text-[13px] text-muted">
                        /{a?.points}
                      </span>
                    </span>
                  </div>
                  {s.feedback && (
                    <p className="mt-2 line-clamp-2 text-[13px] italic text-muted">
                      “{s.feedback}”
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-faint">
                    {relativeTime(s.updatedAt)}
                  </p>
                </SpotlightCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      </div>
    </div>
  );
}
