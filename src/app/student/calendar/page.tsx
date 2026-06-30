"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { CalendarView, CalEvent } from "@/components/app/CalendarView";
import { Aurora } from "@/components/motion";
import { assignmentsForStudent, getGroup } from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { useMemo } from "react";

export default function StudentCalendar() {
  const userId = useSession((s) => s.currentUserId)!;
  const groups = useData((s) => s.groups);
  const assignments = useData((s) => s.assignments);

  const events: CalEvent[] = useMemo(
    () =>
      assignmentsForStudent(assignments, groups, userId).map((a) => ({
        id: a.id,
        title: a.title,
        date: a.dueDate,
        href: `/student/assignments/${a.id}`,
        meta: `${getGroup(groups, a.groupId)?.name ?? ""} · ${a.points} ball`,
      })),
    [assignments, groups, userId]
  );

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow="Kalendar"
        title="Topshiriqlar muddati"
        subtitle="Barcha topshiriqlaringiz muddati bo'yicha kalendarda."
        gradient
      />
      <CalendarView events={events} />
    </div>
  );
}
