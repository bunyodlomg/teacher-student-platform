"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { AssignmentCard } from "@/components/student/AssignmentCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  assignmentsForStudent,
  effectiveStatus,
  submissionFor,
} from "@/lib/selectors";
import { Aurora } from "@/components/motion";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { ListChecks } from "lucide-react";
import { useMemo, useState } from "react";

type Filter = "all" | "todo" | "submitted" | "graded";

export default function StudentAssignments() {
  const userId = useSession((s) => s.currentUserId)!;
  const groups = useData((s) => s.groups);
  const assignments = useData((s) => s.assignments);
  const submissions = useData((s) => s.submissions);
  const [filter, setFilter] = useState<Filter>("all");

  const all = useMemo(
    () => assignmentsForStudent(assignments, groups, userId),
    [assignments, groups, userId]
  );

  const counts = useMemo(() => {
    let todo = 0,
      submitted = 0,
      graded = 0;
    for (const a of all) {
      const s = effectiveStatus(submissionFor(submissions, a.id, userId));
      if (s === "approved") graded++;
      else if (s === "submitted") submitted++;
      else todo++;
    }
    return { all: all.length, todo, submitted, graded };
  }, [all, submissions, userId]);

  const list = all.filter((a) => {
    const s = effectiveStatus(submissionFor(submissions, a.id, userId));
    if (filter === "all") return true;
    if (filter === "todo") return s !== "submitted" && s !== "approved";
    if (filter === "submitted") return s === "submitted";
    return s === "approved";
  });

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow="Topshiriqlar"
        title="Barcha ishlaringiz bir joyda"
        subtitle="Guruhlaringizdagi har bir topshiriq, muddati bo'yicha tartiblangan."
        gradient
      />

      <SegmentedControl
        className="mb-5"
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        segments={[
          { value: "all", label: "Barchasi", count: counts.all },
          { value: "todo", label: "Bajariladigan", count: counts.todo },
          { value: "submitted", label: "Topshirilgan", count: counts.submitted },
          { value: "graded", label: "Baholangan", count: counts.graded },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Hech narsa yo'q"
          description="Bu filtrga mos topshiriq topilmadi."
        />
      ) : (
        <div className="space-y-3">
          {list.map((a, i) => (
            <AssignmentCard key={a.id} assignment={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
