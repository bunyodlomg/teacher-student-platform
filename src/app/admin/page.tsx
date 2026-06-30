"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Monogram } from "@/components/ui/Monogram";
import { StatCard } from "@/components/ui/StatCard";
import { Aurora, Reveal, Stagger, StaggerItem, SpotlightCard } from "@/components/motion";
import { getAssignment, getUser, pendingReviews } from "@/lib/selectors";
import { relativeTime } from "@/lib/utils";
import { useData } from "@/store/data";
import {
  BookOpen,
  GraduationCap,
  LayoutGrid,
  Presentation,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function AdminOverview() {
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);
  const assignments = useData((s) => s.assignments);
  const submissions = useData((s) => s.submissions);

  const teachers = users.filter((u) => u.role === "teacher");
  const students = users.filter((u) => u.role === "student");
  const pending = pendingReviews(submissions);

  const recent = [...submissions]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 6);

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow="Boshqaruv paneli"
        title="Markaz holati"
        subtitle="Foydalanuvchilar, guruhlar va faoliyatning umumiy ko'rinishi."
        gradient
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Foydalanuvchilar" value={users.length} tone="accent" delay={0} />
        <StatCard icon={Presentation} label="O'qituvchilar" value={teachers.length} tone="success" delay={0.06} />
        <StatCard icon={GraduationCap} label="O'quvchilar" value={students.length} tone="warning" delay={0.12} />
        <StatCard icon={LayoutGrid} label="Guruhlar" value={groups.length} tone="accent" delay={0.18} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* So'nggi faoliyat */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-ink">
              So'nggi faoliyat
            </h2>
            <Badge tone={pending.length ? "accent" : "success"} dot>
              {pending.length} tekshirilmagan
            </Badge>
          </div>
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-[13px] text-muted">
              Hali faoliyat yo'q.
            </p>
          ) : (
            <Stagger className="space-y-3" inView>
              {recent.map((s) => {
                const student = getUser(users, s.studentId);
                const a = getAssignment(assignments, s.assignmentId);
                if (!student || !a) return null;
                return (
                  <StaggerItem key={s.id}>
                    <SpotlightCard className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift">
                      <Avatar user={student} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {student.name}
                        </p>
                        <p className="truncate text-[13px] text-muted">{a.title}</p>
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
                        {relativeTime(s.updatedAt)}
                      </span>
                    </SpotlightCard>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>

        {/* Guruhlar */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-ink">Guruhlar</h2>
            <Link
              href="/admin/groups"
              className="text-[13px] font-medium text-accent hover:underline"
            >
              Barchasi
            </Link>
          </div>
          {groups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-[13px] text-muted">
              Hali guruhlar yo'q.
            </p>
          ) : (
            <Stagger className="space-y-3" inView>
              {groups.map((g) => {
                const teacher = getUser(users, g.teacherId);
                return (
                  <StaggerItem key={g.id}>
                    <SpotlightCard className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift">
                      <Monogram label={g.subject} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {g.name}
                        </p>
                        <p className="truncate font-mono text-[11px] uppercase tracking-wider text-faint">
                          {g.studentIds.length} o'quvchi · {teacher?.name}
                        </p>
                      </div>
                      <BookOpen className="h-4 w-4 text-faint transition-transform duration-300 group-hover:scale-110 group-hover:text-accent" />
                    </SpotlightCard>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </section>
      </div>
    </div>
  );
}
