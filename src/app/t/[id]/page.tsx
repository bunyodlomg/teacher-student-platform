"use client";

import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Aurora } from "@/components/motion";
import { ExamRunner, ExamHandlers } from "@/components/student/ExamRunner";
import { ExamQuestion, Test, TestAttempt } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  Play,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Meta {
  id: string;
  title: string;
  subject: string;
  description: string;
  durationMin: number;
  questionCount: number;
}

export default function PublicTest() {
  const id = useParams().id as string;

  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("");
  const [starting, setStarting] = useState(false);
  const [startErr, setStartErr] = useState("");

  const [exam, setExam] = useState<{
    questions: ExamQuestion[];
    attempt: TestAttempt;
    token: string;
  } | null>(null);
  const [finished, setFinished] = useState<TestAttempt | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/public/tests/${id}`)
      .then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (ok && d.test) setMeta(d.test);
        else setLoadErr(d?.error || "Test topilmadi");
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setLoadErr("Tarmoq xatosi");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const phoneOk = phone.replace(/\D/g, "").length >= 7;

  const start = async () => {
    if (!name.trim()) {
      setStartErr("Ism-familiyani kiriting");
      return;
    }
    if (!phoneOk) {
      setStartErr("Ota-ona telefon raqamini kiriting");
      return;
    }
    setStarting(true);
    setStartErr("");
    try {
      const res = await fetch(`/api/public/tests/${id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, grade, phone }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.attempt && d.questions) {
        setExam({ questions: d.questions, attempt: d.attempt, token: d.token });
      } else {
        setStartErr(d?.error || "Testni boshlab bo'lmadi");
      }
    } catch {
      setStartErr("Tarmoq xatosi");
    } finally {
      setStarting(false);
    }
  };

  // ---- exam mode ----
  if (exam && meta) {
    const testObj = {
      id: meta.id,
      title: meta.title,
      durationMin: meta.durationMin,
    } as unknown as Test;

    const handlers: ExamHandlers = {
      saveAnswer: () => {}, // mehmon — topshirishда barcha javob yuboriladi
      reportViolation: () => {},
      submit: async (answers, violations) => {
        try {
          const res = await fetch(`/api/public/tests/${id}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attemptId: exam.attempt.id,
              token: exam.token,
              answers,
              violations,
            }),
          });
          const d = await res.json().catch(() => ({}));
          if (res.ok && d.attempt) return { ok: true, attempt: d.attempt };
          return { ok: false, error: d?.error || "Topshirishда xatolik" };
        } catch {
          return { ok: false, error: "Tarmoq xatosi" };
        }
      },
    };

    return (
      <ExamRunner
        test={testObj}
        questions={exam.questions}
        attempt={exam.attempt}
        handlers={handlers}
        requireFullscreen={false}
        onFinished={(a) => {
          setFinished(a);
          setExam(null);
        }}
      />
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Aurora full intensity={0.7} className="fixed" />

      <header className="glass sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-12">
        {loading ? (
          <div className="py-20 text-center text-muted">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          </div>
        ) : loadErr ? (
          <div className="rounded-3xl border border-border bg-surface p-8 text-center shadow-card">
            <p className="text-[15px] text-muted">{loadErr}</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Bosh sahifa
            </Link>
          </div>
        ) : finished ? (
          <GuestResult attempt={finished} title={meta?.title ?? ""} />
        ) : (
          meta && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8"
            >
              <p className="eyebrow">{meta.subject || "Online test"}</p>
              <h1 className="mt-1.5 font-display text-2xl font-semibold text-ink">
                {meta.title}
              </h1>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat
                  icon={ListChecks}
                  label="Savollar"
                  value={`${meta.questionCount} ta`}
                />
                <Stat
                  icon={Clock}
                  label="Vaqt"
                  value={`${meta.durationMin} daqiqa`}
                />
              </div>

              {meta.description && (
                <p className="mt-5 whitespace-pre-line text-[14px] leading-relaxed text-muted">
                  {meta.description}
                </p>
              )}

              <div className="mt-6 space-y-3">
                <p className="text-[13px] font-semibold text-ink">
                  Ma'lumotlaringiz
                </p>
                <Field label="Ism-familiya">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: Ali Valiyev"
                    autoFocus
                  />
                </Field>
                <Field
                  label="Ota-ona telefoni"
                  hint="natija shu raqamga (Telegram) yuboriladi"
                >
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                  />
                </Field>
                <Field label="Sinf" hint="ixtiyoriy">
                  <Input
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="9-A"
                  />
                </Field>
              </div>

              {startErr && (
                <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
                  {startErr}
                </p>
              )}

              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={start}
                disabled={starting || !name.trim() || !phoneOk}
              >
                {starting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Testni boshlash
              </Button>
              <p className="mt-3 text-center text-[12px] text-faint">
                Test faqat bir marta topshiriladi. Boshlagach vaqt sanoqda.
              </p>
            </motion.div>
          )
        )}
      </div>
    </main>
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

function GuestResult({
  attempt,
  title,
}: {
  attempt: TestAttempt;
  title: string;
}) {
  const pct = attempt.maxScore
    ? Math.round((attempt.score / attempt.maxScore) * 100)
    : 0;
  const tone =
    pct >= 60 ? "text-success" : pct >= 40 ? "text-warning" : "text-danger";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-border bg-surface p-8 text-center shadow-card"
    >
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <p className="text-[13px] text-faint">{title}</p>
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
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Boshqa testlar
      </Link>
    </motion.div>
  );
}
