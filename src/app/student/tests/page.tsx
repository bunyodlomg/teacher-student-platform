"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { attemptFor, getGroup, testsForStudent } from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { relativeTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { Clock, FileCheck2, ListChecks, Play } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function StudentTests() {
  const userId = useSession((s) => s.currentUserId)!;
  const tests = useData((s) => s.tests);
  const groups = useData((s) => s.groups);
  const attempts = useData((s) => s.attempts);

  const list = useMemo(
    () => testsForStudent(tests, groups, userId),
    [tests, groups, userId]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Online DTM"
        title="Testlar"
        subtitle="Ochiq testlarni belgilangan vaqtda ishlang. Har test faqat bir marta topshiriladi."
      />

      {list.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Hozircha test yo'q"
          description="O'qituvchingiz test ochganda shu yerda paydo bo'ladi."
        />
      ) : (
        <div className="grid gap-3">
          {list.map((t, i) => {
            const group = getGroup(groups, t.groupId);
            const at = attemptFor(attempts, t.id, userId);
            const done = at && at.status !== "in_progress";
            const pct =
              at && at.maxScore
                ? Math.round((at.score / at.maxScore) * 100)
                : 0;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    {t.status === "closed" && !done ? (
                      <Badge tone="warning">Yopiq</Badge>
                    ) : done ? (
                      <Badge tone="success" dot>
                        Topshirilgan
                      </Badge>
                    ) : at ? (
                      <Badge tone="accent" dot>
                        Ishlamoqda
                      </Badge>
                    ) : (
                      <Badge tone="accent" dot>
                        Ochiq
                      </Badge>
                    )}
                    {group && (
                      <span className="text-[12px] text-faint">{group.name}</span>
                    )}
                  </div>
                  <p className="font-display text-[17px] font-semibold text-ink">
                    {t.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <ListChecks className="h-3.5 w-3.5 text-faint" />
                      {t.questionCount} savol
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-faint" />
                      {t.durationMin} daqiqa
                    </span>
                    <span className="text-faint">{relativeTime(t.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {done && (
                    <span className="font-display text-2xl font-semibold text-success">
                      {pct}%
                    </span>
                  )}
                  {done ? (
                    <Link href={`/student/tests/${t.id}`}>
                      <Button variant="secondary" size="sm">
                        Natija
                      </Button>
                    </Link>
                  ) : t.status === "closed" ? (
                    <Button variant="secondary" size="sm" disabled>
                      Yopilgan
                    </Button>
                  ) : (
                    <Link href={`/student/tests/${t.id}`}>
                      <Button size="sm">
                        <Play className="h-4 w-4" />
                        {at ? "Davom etish" : "Boshlash"}
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
