"use client";

import { GroupHero } from "@/components/app/GroupHero";
import { PostCard } from "@/components/feed/PostCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/Progress";
import { Composer } from "@/components/teacher/Composer";
import { Aurora, Stagger, StaggerItem, SpotlightCard } from "@/components/motion";
import {
  getGroup,
  postsForGroup,
  submissionsForAssignment,
} from "@/lib/selectors";
import { dueLabel } from "@/lib/utils";
import { useData } from "@/store/data";
import { BookOpen, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function TeacherGroup() {
  const params = useParams();
  const id = params.id as string;
  const groups = useData((s) => s.groups);
  const posts = useData((s) => s.posts);
  const assignments = useData((s) => s.assignments);
  const submissions = useData((s) => s.submissions);

  const [composer, setComposer] = useState(false);

  const group = getGroup(groups, id);
  const feed = useMemo(() => postsForGroup(posts, id), [posts, id]);
  const groupAssignments = useMemo(
    () =>
      assignments
        .filter((a) => a.groupId === id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [assignments, id]
  );

  if (!group) {
    return <div className="py-20 text-center text-muted">Guruh topilmadi.</div>;
  }

  return (
    <div className="relative">
      <Aurora />
      <GroupHero
        group={group}
        action={
          <Button size="sm" onClick={() => setComposer(true)}>
            <Plus className="h-4 w-4" /> Ulashish
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Lenta */}
        <div className="lg:col-span-3">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">
            Guruh lentasi
          </h2>
          {feed.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Suhbatni boshlang"
              description="Birinchi darsingiz, e'loningiz yoki topshiriqingizni ulashing."
              action={
                <Button size="sm" onClick={() => setComposer(true)}>
                  <Plus className="h-4 w-4" /> Post yaratish
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {feed.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Topshiriqlar ko'rinishi */}
        <aside className="lg:col-span-2">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">
            Topshiriqlar
          </h2>
          <Stagger className="space-y-3" inView>
            {groupAssignments.length === 0 && (
              <p className="text-sm text-muted">Hali topshiriq yo'q.</p>
            )}
            {groupAssignments.map((a) => {
              const subs = submissionsForAssignment(submissions, a.id).filter(
                (s) => s.status !== "draft" && s.status !== "not_started"
              );
              const total = group.studentIds.length;
              const due = dueLabel(a.dueDate);
              const pending = subs.filter((s) => s.status === "submitted").length;
              return (
                <StaggerItem key={a.id}>
                <SpotlightCard className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    {pending > 0 && (
                      <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                        {pending} yangi
                      </span>
                    )}
                  </div>
                  <p className="mb-2 mt-0.5 text-[12px] text-faint">
                    {due.label} · {a.points} ball
                  </p>
                  <ProgressBar value={total ? (subs.length / total) * 100 : 0} />
                  <p className="mt-1.5 text-[11px] text-faint">
                    {subs.length}/{total} topshirildi
                  </p>
                </SpotlightCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </aside>
      </div>

      <Composer
        open={composer}
        onClose={() => setComposer(false)}
        groupId={group.id}
      />
    </div>
  );
}
