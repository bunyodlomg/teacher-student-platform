"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ExamRunner } from "@/components/student/ExamRunner";
import { attemptFor, getGroup, getTest } from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { ExamQuestion, TestAttempt } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ListChecks,
  Loader2,
  Maximize,
  Play,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface Fs extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

export default function StudentTestDetail() {
  const id = useParams().id as string;
  const userId = useSession((s) => s.currentUserId)!;
  const tests = useData((s) => s.tests);
  const groups = useData((s) => s.groups);
  const storeAttempts = useData((s) => s.attempts);
  const startAttempt = useData((s) => s.startAttempt);

  const test = getTest(tests, id);
  const group = test ? getGroup(groups, test.groupId) : undefined;
  const storeAttempt = attemptFor(storeAttempts, id, userId);

  const [phase, setPhase] = useState<"intro" | "exam">("intro");
  const [exam, setExam] = useState<{
    questions: ExamQuestion[];
    attempt: TestAttempt;
  } | null>(null);
  const [finished, setFinished] = useState<TestAttempt | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  if (!test) {
    return <div className="py-20 text-center text-muted">Test topilmadi.</div>;
  }

  const doneAttempt =
    finished ??
    (storeAttempt && storeAttempt.status !== "in_progress"
      ? storeAttempt
      : null);

  // ---- exam mode ----
  if (phase === "exam" && exam) {
    return (
      <ExamRunner
        test={test}
        questions={exam.questions}
        attempt={exam.attempt}
        onFinished={(a) => {
          setFinished(a);
          setExam(null);
          setPhase("intro");
        }}
      />
    );
  }

  // ---- result ----
  if (doneAttempt) {
    return <ResultView attempt={doneAttempt} testTitle={test.title} />;
  }

  const resuming = !!storeAttempt && storeAttempt.status === "in_progress";

  const start = async () => {
    setStarting(true);
    setError("");
    // fullscreen — foydalanuvchi bosishida so'raladi
    try {
      const el = document.documentElement as Fs;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* rad etilsa ham davom etamiz */
    }
    const res = await startAttempt(id);
    setStarting(false);
    if (res.ok && res.questions && res.attempt) {
      setExam({ questions: res.questions, attempt: res.attempt });
      setPhase("exam");
    } else {
      setError(res.error || "Testni boshlab bo'lmadi");
    }
  };

  // ---- intro ----
  return (
    <div>
      <Link
        href="/student/tests"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha testlar
      </Link>

      <PageHeader eyebrow={group?.name} title={test.title} />

      <div className="mx-auto max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-surface p-6 shadow-card"
        >
          <div className="mb-5 grid grid-cols-2 gap-3">
            <Stat icon={ListChecks} label="Savollar" value={`${test.questionCount} ta`} />
            <Stat icon={Clock} label="Vaqt" value={`${test.durationMin} daqiqa`} />
          </div>

          {test.description && (
            <p className="mb-5 whitespace-pre-line text-[14px] leading-relaxed text-muted">
              {test.description}
            </p>
          )}

          <div className="mb-5 space-y-2.5 rounded-2xl border border-warning/25 bg-warning/5 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <ShieldAlert className="h-4 w-4 text-warning" /> Imtihon qoidalari
            </p>
            <Rule icon={Maximize}>
              Test to'liq ekran (fullscreen) rejimida ishlanadi.
            </Rule>
            <Rule icon={AlertTriangle}>
              Boshqa oyna/ilovaga o'tsangiz — bu qayd etiladi va o'qituvchi ko'radi.
            </Rule>
            <Rule icon={Copy}>Nusxa ko'chirish (copy/paste) o'chirilgan.</Rule>
            <Rule icon={ShieldAlert}>Test faqat bir marta topshiriladi.</Rule>
          </div>

          {resuming && (
            <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent">
              Sizda tugallanmagan urinish bor — davom etishingiz mumkin.
            </p>
          )}
          {error && (
            <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}

          <Button size="lg" className="w-full" onClick={start} disabled={starting}>
            {starting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            {resuming ? "Davom etish" : "Testni boshlash"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg/40 p-3">
      <Icon className="mb-2 h-5 w-5 text-accent" />
      <p className="font-display text-lg font-semibold text-ink">{value}</p>
      <p className="text-[12px] text-faint">{label}</p>
    </div>
  );
}

function Rule({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      {children}
    </p>
  );
}

function ResultView({
  attempt,
  testTitle,
}: {
  attempt: TestAttempt;
  testTitle: string;
}) {
  const pct = attempt.maxScore
    ? Math.round((attempt.score / attempt.maxScore) * 100)
    : 0;
  const tone =
    pct >= 60 ? "text-success" : pct >= 40 ? "text-warning" : "text-danger";

  return (
    <div>
      <Link
        href="/student/tests"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha testlar
      </Link>

      <div className="mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-border bg-surface p-8 text-center shadow-card"
        >
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-[13px] text-faint">{testTitle}</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-ink">
            Test topshirildi
          </h2>

          <div className={cn("mt-6 font-display text-6xl font-bold", tone)}>
            {pct}%
          </div>
          <p className="mt-2 text-[15px] text-muted">
            {attempt.correctCount}/{attempt.totalCount} to'g'ri ·{" "}
            <span className="font-semibold text-ink">
              {attempt.score}/{attempt.maxScore} ball
            </span>
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            {attempt.status === "auto_submitted" && (
              <Badge tone="warning" dot>
                Vaqt tugadi
              </Badge>
            )}
            {attempt.violations > 0 && (
              <Badge tone="danger">
                <AlertTriangle className="h-3.5 w-3.5" /> {attempt.violations} ogohlantirish
              </Badge>
            )}
          </div>

          <p className="mt-6 text-[12px] text-faint">
            Natija o'qituvchingizga yuborildi.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
