"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TestBuilderModal } from "@/components/teacher/TestBuilderModal";
import { toast } from "@/store/toast";
import {
  attemptsForTest,
  getGroup,
  testsForTeacher,
} from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { Test } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Clock,
  FileCheck2,
  ListChecks,
  Lock,
  Play,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const statusMeta: Record<
  Test["status"],
  { label: string; tone: "neutral" | "success" | "warning" }
> = {
  draft: { label: "Qoralama", tone: "neutral" },
  open: { label: "Ochiq", tone: "success" },
  closed: { label: "Yopiq", tone: "warning" },
};

export default function TeacherTests() {
  const user = useSession((s) => s.user);
  const tests = useData((s) => s.tests);
  const groups = useData((s) => s.groups);
  const attempts = useData((s) => s.attempts);
  const setTestStatus = useData((s) => s.setTestStatus);
  const deleteTest = useData((s) => s.deleteTest);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Test | null>(null);

  const myTests = useMemo(
    () => (user ? testsForTeacher(tests, groups, user.id) : []),
    [tests, groups, user]
  );

  const toggle = async (t: Test) => {
    const opening = t.status !== "open";
    setBusy(t.id);
    const res = await setTestStatus(t.id, opening ? "open" : "closed");
    setBusy(null);
    if (res.ok)
      toast.success(
        opening ? "Test ochildi — o'quvchilar ishlashi mumkin" : "Test yopildi"
      );
    else toast.error(res.error || "Xatolik yuz berdi");
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(toDelete.id);
    const res = await deleteTest(toDelete.id);
    setBusy(null);
    if (res.ok) toast.success("Test o'chirildi");
    else toast.error(res.error || "O'chirishda xatolik");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Online DTM"
        title="Testlar"
        subtitle="Test yarating, import qiling va o'quvchilarga ruxsat bering. Natijalar avtomatik saqlanadi."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Yangi test
          </Button>
        }
      />

      {myTests.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Hali test yo'q"
          description="Birinchi testingizni yarating yoki Excel/CSV'dan import qiling."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Yangi test
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {myTests.map((t, i) => {
            const group = getGroup(groups, t.groupId);
            const list = attemptsForTest(attempts, t.id);
            const done = list.filter((a) => a.status !== "in_progress");
            const avg =
              done.length && t.totalPoints
                ? Math.round(
                    (done.reduce((s, a) => s + a.score, 0) /
                      (done.length * t.totalPoints)) *
                      100
                  )
                : null;
            const sm = statusMeta[t.status];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone={sm.tone} dot>
                        {sm.label}
                      </Badge>
                      {group && (
                        <span className="text-[12px] text-faint">
                          {group.name}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/teacher/tests/${t.id}`}
                      className="font-display text-[17px] font-semibold text-ink transition-colors hover:text-accent"
                    >
                      {t.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5 text-faint" />
                        {t.questionCount} savol · {t.totalPoints} ball
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-faint" />
                        {t.durationMin} daqiqa
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-faint" />
                        {done.length} topshirgan
                      </span>
                      {avg !== null && (
                        <span className="font-medium text-accent">
                          o'rtacha {avg}%
                        </span>
                      )}
                      <span className="text-faint">
                        {relativeTime(t.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={t.status === "open" ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => toggle(t)}
                      disabled={busy === t.id}
                    >
                      {t.status === "open" ? (
                        <>
                          <Lock className="h-4 w-4" /> Yopish
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          {t.status === "closed" ? "Qayta ochish" : "Ruxsat berish"}
                        </>
                      )}
                    </Button>
                    <Link href={`/teacher/tests/${t.id}`}>
                      <Button variant="secondary" size="sm">
                        Natijalar
                      </Button>
                    </Link>
                    <button
                      onClick={() => setToDelete(t)}
                      disabled={busy === t.id}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                      )}
                      title="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <TestBuilderModal open={open} onClose={() => setOpen(false)} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Testni o'chirish"
        description="Bu testni va unga tegishli barcha natijalarni butunlay o'chiradi. Buni qaytarib bo'lmaydi."
        body={
          toDelete ? (
            <>
              <span className="font-medium text-ink">“{toDelete.title}”</span>{" "}
              testini o'chirishni tasdiqlaysizmi?
            </>
          ) : null
        }
        confirmLabel="O'chirish"
        busyLabel="O'chirilmoqda…"
      />
    </div>
  );
}
