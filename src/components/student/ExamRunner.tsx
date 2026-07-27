"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useData } from "@/store/data";
import { ExamQuestion, Test, TestAttempt } from "@/lib/types";
import { useExamGuard, ViolationType } from "@/lib/useExamGuard";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface AnswerMap {
  [questionId: string]: { optionId?: string; text?: string };
}

function fmtClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamRunner({
  test,
  questions,
  attempt,
  onFinished,
}: {
  test: Test;
  questions: ExamQuestion[];
  attempt: TestAttempt;
  onFinished: (a: TestAttempt) => void;
}) {
  const saveAnswer = useData((s) => s.saveAnswer);
  const submitAttempt = useData((s) => s.submitAttempt);
  const reportViolation = useData((s) => s.reportViolation);

  const [answers, setAnswers] = useState<AnswerMap>(() => {
    const m: AnswerMap = {};
    for (const a of attempt.answers)
      m[a.questionId] = { optionId: a.optionId, text: a.text };
    return m;
  });
  const [idx, setIdx] = useState(0);
  const [violations, setViolations] = useState(attempt.violations ?? 0);
  const [warn, setWarn] = useState<string>("");
  const [remaining, setRemaining] = useState(() =>
    Math.round((new Date(attempt.endsAt).getTime() - Date.now()) / 1000)
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submittedRef = useRef(false);
  const textTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const onViolation = useCallback(
    (type: ViolationType) => {
      setViolations((v) => v + 1);
      reportViolation(test.id);
      setWarn(
        type === "fullscreen"
          ? "To'liq ekrandan chiqdingiz — bu qayd etildi."
          : type === "copy"
          ? "Nusxalash bloklangan."
          : "Boshqa oyna/ilovaga o'tish qayd etildi!"
      );
      window.setTimeout(() => setWarn(""), 3500);
    },
    [reportViolation, test.id]
  );

  const guard = useExamGuard({
    active: true,
    onViolation,
    requireFullscreen: true,
    blockCopy: true,
  });

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      const payload = questions.map((q) => ({
        questionId: q.id,
        optionId: answers[q.id]?.optionId,
        text: answers[q.id]?.text,
      }));
      const res = await submitAttempt(test.id, payload, violations);
      await guard.exitFullscreen();
      setSubmitting(false);
      if (res.ok && res.attempt) onFinished(res.attempt);
      else {
        submittedRef.current = false;
        setWarn(res.error || "Topshirishda xatolik");
      }
      void auto;
    },
    [answers, questions, submitAttempt, test.id, violations, guard, onFinished]
  );

  // countdown — vaqt tugasa avto-topshirish
  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.round(
        (new Date(attempt.endsAt).getTime() - Date.now()) / 1000
      );
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        submit(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [attempt.endsAt, submit]);

  const setAnswer = (q: ExamQuestion, val: { optionId?: string; text?: string }) => {
    setAnswers((m) => ({ ...m, [q.id]: val }));
    if (q.type === "short") {
      clearTimeout(textTimers.current[q.id]);
      textTimers.current[q.id] = setTimeout(
        () => saveAnswer(test.id, q.id, val),
        600
      );
    } else {
      saveAnswer(test.id, q.id, val);
    }
  };

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => {
        const a = answers[q.id];
        return a && (a.optionId || (a.text && a.text.trim()));
      }).length,
    [answers, questions]
  );

  // klaviatura: ← → navigatsiya, A/B/C/D yoki 1-9 variant tanlash
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight")
        setIdx((i) => Math.min(questions.length - 1, i + 1));
      else {
        const cur = questions[idx];
        if (!cur || cur.type === "short") return;
        const k = e.key.toLowerCase();
        let oi = -1;
        if (/^[a-f]$/.test(k)) oi = "abcdef".indexOf(k);
        else if (/^[1-9]$/.test(k)) oi = parseInt(k, 10) - 1;
        const opt = cur.options[oi];
        if (opt) setAnswer(cur, { optionId: opt.id });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, questions]);

  const q = questions[idx];
  const low = remaining <= 60;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      {/* header */}
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">
            {test.title}
          </p>
          <p className="text-[11px] text-faint">
            {answeredCount}/{questions.length} javob berildi
          </p>
        </div>
        {violations > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-lg bg-danger/10 px-2 py-1 text-[12px] font-semibold text-danger"
            title="Fokus yo'qolishi qayd etildi"
          >
            <ShieldAlert className="h-4 w-4" /> {violations}
          </span>
        )}
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-display text-lg font-semibold tabular-nums",
            low ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
          )}
        >
          {fmtClock(remaining)}
        </div>
      </header>

      {/* violation banner */}
      <AnimatePresence>
        {warn && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-center gap-2 bg-danger px-4 py-2 text-[13px] font-medium text-white"
          >
            <AlertTriangle className="h-4 w-4" /> {warn}
          </motion.div>
        )}
      </AnimatePresence>

      {/* fullscreen re-enter prompt */}
      {!guard.fullscreen && (
        <div className="flex items-center justify-center gap-3 border-b border-border bg-warning/10 px-4 py-2 text-[13px] text-warning">
          <span className="font-medium">To'liq ekran rejimi talab qilinadi.</span>
          <button
            onClick={guard.requestFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg bg-warning/20 px-2.5 py-1 font-semibold"
          >
            <Maximize className="h-3.5 w-3.5" /> Kirish
          </button>
        </div>
      )}

      {/* body */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
        {/* navigator */}
        <div className="flex flex-wrap gap-1.5">
          {questions.map((qq, i) => {
            const a = answers[qq.id];
            const answered = a && (a.optionId || (a.text && a.text.trim()));
            return (
              <button
                key={qq.id}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-8 w-8 rounded-lg text-[13px] font-semibold transition-colors",
                  i === idx
                    ? "bg-accent text-accent-ink"
                    : answered
                    ? "bg-success/15 text-success"
                    : "bg-elevated text-muted hover:bg-border"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* question */}
        {q && (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-border bg-surface p-5 shadow-card"
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-[14px] font-semibold text-accent">
                {idx + 1}
              </span>
              <p className="pt-1 text-[16px] font-medium leading-relaxed text-ink">
                {q.text}
              </p>
            </div>
            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={q.imageUrl}
                alt=""
                className="mb-4 max-h-72 rounded-xl object-contain"
              />
            )}

            {q.type === "short" ? (
              <Input
                autoFocus
                value={answers[q.id]?.text ?? ""}
                onChange={(e) => setAnswer(q, { text: e.target.value })}
                placeholder="Javobingizni yozing…"
              />
            ) : (
              <div className="space-y-2">
                {q.options.map((o, oi) => {
                  const selected = answers[q.id]?.optionId === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setAnswer(q, { optionId: o.id })}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-accent bg-accent-soft"
                          : "border-border bg-bg/40 hover:border-accent/40 hover:bg-elevated"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] font-semibold",
                          selected
                            ? "bg-accent text-accent-ink"
                            : "bg-elevated text-muted"
                        )}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="text-[15px] text-ink">{o.text}</span>
                      {selected && (
                        <CheckCircle2 className="ml-auto h-5 w-5 text-accent" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* footer nav */}
      <footer className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          <ChevronLeft className="h-4 w-4" /> Oldingi
        </Button>
        {idx < questions.length - 1 ? (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))}
          >
            Keyingi <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Yakunlash
          </Button>
        )}
      </footer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => submit(false)}
        title="Testni yakunlash"
        tone="primary"
        confirmLabel="Ha, yakunlash"
        cancelLabel="Davom etish"
        busyLabel="Topshirilmoqda…"
        body={
          <>
            {answeredCount}/{questions.length} savolga javob berdingiz.
            {answeredCount < questions.length && (
              <span className="mt-1 block font-medium text-warning">
                {questions.length - answeredCount} ta savol javobsiz qoladi.
              </span>
            )}{" "}
            Yakunlaganingizdan so'ng javoblarni o'zgartirib bo'lmaydi.
          </>
        }
      />
    </div>
  );
}
