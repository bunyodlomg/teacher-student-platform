"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Aurora, Stagger, StaggerItem, SpotlightCard } from "@/components/motion";
import { ReviewModal } from "@/components/teacher/ReviewModal";
import { getAssignment, getGroup, getUser } from "@/lib/selectors";
import { Submission } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { useData } from "@/store/data";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";

type Filter = "pending" | "graded" | "all";

export default function ReviewDesk() {
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);
  const assignments = useData((s) => s.assignments);
  const submissions = useData((s) => s.submissions);

  const [filter, setFilter] = useState<Filter>("pending");
  const [review, setReview] = useState<Submission | null>(null);

  const real = useMemo(
    () => submissions.filter((s) => s.status !== "draft" && s.status !== "not_started"),
    [submissions]
  );

  const counts = {
    pending: real.filter((s) => s.status === "submitted").length,
    graded: real.filter((s) => s.status === "approved" || s.status === "rejected").length,
    all: real.length,
  };

  const list = real
    .filter((s) => {
      if (filter === "pending") return s.status === "submitted";
      if (filter === "graded") return s.status === "approved" || s.status === "rejected";
      return true;
    })
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow="Tekshirish stoli"
        title="Topshirilgan ishlar — siz tayyor bo'lganda"
        subtitle="Tasdiqlang, baholang yoki izoh bilan qaytaring — ikki bosishda."
        gradient
      />

      <SegmentedControl
        className="mb-5"
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        segments={[
          { value: "pending", label: "Tekshirish kerak", count: counts.pending },
          { value: "graded", label: "Tekshirilgan", count: counts.graded },
          { value: "all", label: "Barchasi", count: counts.all },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Tekshiradigan narsa yo'q"
          description="O'quvchilar ish topshirsa, ular shu yerda saf tortadi."
        />
      ) : (
        <Stagger className="space-y-3" inView>
          {list.map((s) => {
            const student = getUser(users, s.studentId);
            const a = getAssignment(assignments, s.assignmentId);
            const g = a ? getGroup(groups, a.groupId) : undefined;
            if (!student || !a) return null;
            return (
              <StaggerItem key={s.id}>
                <SpotlightCard className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-lift">
                  <Avatar user={student} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {student.name}
                    </p>
                    <p className="truncate text-[13px] text-muted">{a.title}</p>
                    <p className="text-[11px] text-faint">
                      {g?.name} · {relativeTime(s.updatedAt)}
                    </p>
                  </div>
                  {s.status === "approved" && (
                    <span className="font-display text-lg font-semibold text-success">
                      {s.score}
                      <span className="text-[13px] text-muted">/{a.points}</span>
                    </span>
                  )}
                  <StatusBadge status={s.status} />
                  <Button
                    size="sm"
                    variant={s.status === "submitted" ? "primary" : "secondary"}
                    onClick={() => setReview(s)}
                  >
                    {s.status === "submitted" ? "Tekshirish" : "Ko'rish"}
                  </Button>
                </SpotlightCard>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <ReviewModal submission={review} onClose={() => setReview(null)} />
    </div>
  );
}
