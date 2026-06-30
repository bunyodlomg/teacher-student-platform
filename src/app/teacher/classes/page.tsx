"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { AvatarStack } from "@/components/ui/Avatar";
import { Monogram } from "@/components/ui/Monogram";
import { getUser, groupsForUser } from "@/lib/selectors";
import { Aurora, Stagger, StaggerItem } from "@/components/motion";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function TeacherClasses() {
  const teacherId = useSession((s) => s.currentUserId)!;
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);
  const posts = useData((s) => s.posts);
  const assignments = useData((s) => s.assignments);

  const myGroups = groupsForUser(groups, teacherId, "teacher");

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow="Guruhlar"
        title="Guruhlaringiz"
        subtitle="Har bir makonning o'z lentasi, topshiriqlari va odamlari bor."
        gradient
      />

      <Stagger className="grid gap-4 sm:grid-cols-2" inView>
        {myGroups.map((g) => {
          const students = g.studentIds
            .map((id) => getUser(users, id))
            .filter(Boolean) as { name: string; hue: string }[];
          const groupPosts = posts.filter((p) => p.groupId === g.id).length;
          const groupAssignments = assignments.filter(
            (a) => a.groupId === g.id
          ).length;
          return (
            <StaggerItem key={g.id}>
              <Link
                href={`/teacher/groups/${g.id}`}
                className="group block rounded-2xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-start justify-between">
                  <Monogram label={g.subject} size="lg" accent />
                  <ArrowUpRight className="h-5 w-5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                </div>
                <p className="eyebrow mt-4">{g.subject}</p>
                <h3 className="mt-1 font-display text-xl font-medium text-ink">
                  {g.name}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-muted">
                  {g.description}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <AvatarStack users={students} size="sm" max={5} />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
                    {groupAssignments} topshiriq · {groupPosts} post
                  </span>
                </div>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
