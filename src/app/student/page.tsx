"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { AssignmentCard } from "@/components/student/AssignmentCard";
import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Aurora } from "@/components/motion";
import {
  assignmentsForStudent,
  effectiveStatus,
  feedForUser,
  getUser,
  studentStats,
  submissionFor,
} from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { daysUntil } from "@/lib/utils";
import { CalendarClock, Flame, ListTodo, PartyPopper, Trophy } from "lucide-react";
import Link from "next/link";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Xayrli tong";
  if (h < 18) return "Xayrli kun";
  return "Xayrli kech";
}

export default function StudentDashboard() {
  const userId = useSession((s) => s.currentUserId)!;
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);
  const assignments = useData((s) => s.assignments);
  const submissions = useData((s) => s.submissions);
  const posts = useData((s) => s.posts);

  const me = getUser(users, userId);
  const stats = studentStats(assignments, groups, submissions, userId);

  const upcoming = assignmentsForStudent(assignments, groups, userId)
    .filter((a) => {
      const status = effectiveStatus(submissionFor(submissions, a.id, userId));
      return status !== "submitted" && status !== "approved";
    })
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
    .slice(0, 4);

  const recent = feedForUser(posts, groups, userId, "student").slice(0, 3);

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow={new Date().toLocaleDateString("uz-UZ", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        title={`${greeting()}, ${me?.name.split(" ")[0]} 👋`}
        subtitle="Bugun sizga kerak bo'lgan hamma narsa shu yerda — ortiqchasi yo'q."
        gradient
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={ListTodo}
          label="Navbatdagi vazifalar"
          value={stats.pending}
          tone={stats.pending > 0 ? "accent" : "success"}
          delay={0}
        />
        <StatCard
          icon={CalendarClock}
          label="Muddati o'tgan"
          value={stats.overdue}
          tone={stats.overdue > 0 ? "danger" : "success"}
          delay={0.06}
        />
        <StatCard
          icon={Trophy}
          label="O'rtacha baho"
          value={stats.avgScore ?? "—"}
          suffix={stats.avgScore !== null ? "%" : undefined}
          hint={`${stats.graded} ta baholandi`}
          tone="success"
          delay={0.12}
        />
        <StatCard
          icon={Flame}
          label="Kunlik ketma-ketlik"
          value={stats.streak}
          tone="warning"
          delay={0.18}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* Navbatda */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">
              Navbatda
            </h2>
            <Link
              href="/student/assignments"
              className="text-[13px] font-medium text-accent hover:underline"
            >
              Barchasi
            </Link>
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <EmptyState
                icon={PartyPopper}
                title="Hammasi bajarilgan"
                description="Navbatdagi topshiriqlar yo'q. Biror narsani zavq uchun qayta o'qing."
              />
            ) : (
              upcoming.map((a, i) => (
                <AssignmentCard key={a.id} assignment={a} index={i} />
              ))
            )}
          </div>
        </section>

        {/* So'nggi lenta */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">
              O'qituvchilaringizdan so'nggi
            </h2>
          </div>
          <div className="space-y-4">
            {recent.map((p, i) => (
              <PostCard key={p.id} post={p} index={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
