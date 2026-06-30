"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Monogram } from "@/components/ui/Monogram";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Aurora, Stagger, StaggerItem, SpotlightCard } from "@/components/motion";
import { ReviewModal } from "@/components/teacher/ReviewModal";
import {
  getAssignment,
  getGroup,
  getUser,
  groupsForUser,
  pendingReviews,
  teacherStats,
} from "@/lib/selectors";
import { Submission } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import {
  ClipboardCheck,
  GraduationCap,
  Inbox,
  LayoutGrid,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function TeacherDashboard() {
  const teacherId = useSession((s) => s.currentUserId)!;
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);
  const posts = useData((s) => s.posts);
  const assignments = useData((s) => s.assignments);
  const submissions = useData((s) => s.submissions);

  const me = getUser(users, teacherId);
  const stats = teacherStats(groups, posts, submissions, teacherId);
  const myGroups = groupsForUser(groups, teacherId, "teacher");
  const queue = pendingReviews(submissions).sort(
    (a, b) =>
      +new Date(a.submittedAt ?? a.updatedAt) -
      +new Date(b.submittedAt ?? b.updatedAt)
  );

  const [review, setReview] = useState<Submission | null>(null);

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow="O'qitish"
        title={`Xush kelibsiz, ${me?.name.split(" ")[0] ?? me?.name}`}
        subtitle="O'quvchilaringiz ish qildi. Mana sizni kutayotgan narsalar."
        gradient
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ClipboardCheck} label="Tekshirish kerak" value={stats.pendingReviews} tone={stats.pendingReviews ? "accent" : "success"} delay={0} />
        <StatCard icon={GraduationCap} label="O'quvchilar" value={stats.students} tone="success" delay={0.06} />
        <StatCard icon={LayoutGrid} label="Guruhlar" value={stats.groups} tone="warning" delay={0.12} />
        <StatCard icon={PenLine} label="Shu haftadagi postlar" value={stats.postsThisWeek} tone="accent" delay={0.18} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* Tekshirish navbati */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">
              Tekshiruvingizni kutmoqda
            </h2>
            <Link
              href="/teacher/review"
              className="text-[13px] font-medium text-accent hover:underline"
            >
              Tekshirish stolini ochish
            </Link>
          </div>

          {queue.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Tekshirish navbati bo'sh"
              description="Har bir topshirilgan ish baholandi. Ajoyib!"
            />
          ) : (
            <Stagger className="space-y-3" inView>
              {queue.map((s) => {
                const student = getUser(users, s.studentId);
                const a = getAssignment(assignments, s.assignmentId);
                const g = a ? getGroup(groups, a.groupId) : undefined;
                if (!student || !a) return null;
                return (
                  <StaggerItem key={s.id}>
                    <SpotlightCard className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift">
                      <Avatar user={student} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {student.name}
                        </p>
                        <p className="truncate text-[13px] text-muted">
                          {a.title}
                        </p>
                        <p className="text-[11px] text-faint">
                          {g?.name} · {relativeTime(s.submittedAt ?? s.updatedAt)}{" "}
                          topshirildi
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setReview(s)}>
                        Tekshirish
                      </Button>
                    </SpotlightCard>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>

        {/* Sinflar */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">
            Guruhlaringiz
          </h2>
          <Stagger className="space-y-3" inView>
            {myGroups.map((g) => {
              const groupPosts = posts.filter((p) => p.groupId === g.id).length;
              return (
                <StaggerItem key={g.id}>
                  <Link
                    href={`/teacher/groups/${g.id}`}
                    className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <Monogram label={g.subject} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {g.name}
                      </p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
                        {g.studentIds.length} o'quvchi · {groupPosts} post
                      </p>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      </div>

      <ReviewModal submission={review} onClose={() => setReview(null)} />
    </div>
  );
}
