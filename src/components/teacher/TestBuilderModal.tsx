"use client";

import { Modal } from "@/components/ui/Modal";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { NewTestInput, NewTestQuestion, useData } from "@/store/data";
import { useSession } from "@/store/session";
import { groupsForUser } from "@/lib/selectors";
import { parseTestFile, templateWorkbookBlob } from "@/lib/testImport";
import { toast } from "@/store/toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Copy,
  Download,
  FileSpreadsheet,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  Type,
  ToggleLeft,
  ListChecks,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type QType = "single" | "boolean" | "short";

interface DraftQ {
  key: string;
  type: QType;
  text: string;
  options: string[];
  correctIndex: number;
  correctText: string;
  points: number;
}

let seq = 0;
const uid = () => `q${Date.now()}_${seq++}`;

function blankQ(type: QType): DraftQ {
  if (type === "boolean")
    return {
      key: uid(),
      type,
      text: "",
      options: ["To'g'ri", "Noto'g'ri"],
      correctIndex: 0,
      correctText: "",
      points: 1,
    };
  if (type === "short")
    return { key: uid(), type, text: "", options: [], correctIndex: 0, correctText: "", points: 1 };
  return {
    key: uid(),
    type: "single",
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    correctText: "",
    points: 1,
  };
}

const typeMeta: Record<QType, { label: string; icon: typeof Type }> = {
  single: { label: "Bir javobli", icon: ListChecks },
  boolean: { label: "To'g'ri/Noto'g'ri", icon: ToggleLeft },
  short: { label: "Qisqa yozma", icon: Type },
};

export function TestBuilderModal({
  open,
  onClose,
  defaultGroupId,
}: {
  open: boolean;
  onClose: () => void;
  defaultGroupId?: string;
}) {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const groups = useData((s) => s.groups);
  const createTest = useData((s) => s.createTest);

  const myGroups = useMemo(
    () => (user ? groupsForUser(groups, user.id, "teacher") : []),
    [groups, user]
  );

  const [groupId, setGroupId] = useState(defaultGroupId || "");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [questions, setQuestions] = useState<DraftQ[]>([blankQ("single")]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [importNote, setImportNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const gid = groupId || myGroups[0]?.id || "";

  const patch = (key: string, d: Partial<DraftQ>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...d } : q)));

  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);

  const runImport = async (file: File) => {
    setImporting(true);
    setError("");
    setImportNote("");
    try {
      const { questions: imported, errors } = await parseTestFile(file);
      if (imported.length) {
        setQuestions((prev) => {
          // dastlabki bo'sh savolni almashtiramiz
          const base =
            prev.length === 1 && !prev[0].text.trim() ? [] : prev;
          return [...base, ...imported.map(fromImported)];
        });
        setImportNote(
          `${imported.length} ta savol qo'shildi${
            errors.length ? ` · ${errors.length} qatorda muammo` : ""
          }`
        );
      }
      if (errors.length) setError(errors.slice(0, 4).join(" · "));
    } catch {
      setError("Faylni o'qib bo'lmadi. .xlsx yoki .csv ekanini tekshiring.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = async () => {
    const blob = await templateWorkbookBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-namuna.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Test nomini kiriting";
    if (!gid) return "Guruhni tanlang";
    if (!questions.length) return "Kamida bitta savol qo'shing";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return `${i + 1}-savol matni bo'sh`;
      if (q.type === "short") {
        if (!q.correctText.trim()) return `${i + 1}-savol: to'g'ri javob bo'sh`;
      } else {
        const opts = q.options.filter((o) => o.trim());
        if (opts.length < 2) return `${i + 1}-savol: kamida 2 ta variant`;
        if (!q.options[q.correctIndex]?.trim())
          return `${i + 1}-savol: to'g'ri variant belgilang`;
      }
    }
    return null;
  };

  const save = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    setError("");
    const payload: NewTestInput = {
      groupId: gid,
      title: title.trim(),
      subject: subject.trim(),
      durationMin,
      shuffleQuestions,
      shuffleOptions,
      questions: questions.map(toNewQuestion),
    };
    const res = await createTest(payload);
    setSaving(false);
    if (res.ok) {
      toast.success(`Test yaratildi — ${questions.length} savol`);
      reset();
      onClose();
      if (res.testId) router.push(`/teacher/tests/${res.testId}`);
    } else {
      setError(res.error || "Saqlashda xatolik");
    }
  };

  const reset = () => {
    setTitle("");
    setSubject("");
    setDurationMin(30);
    setQuestions([blankQ("single")]);
    setError("");
    setImportNote("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yangi test"
      description="Savollarni qo'lda qo'shing yoki Excel/CSV'dan import qiling"
      className="sm:max-w-3xl"
      onDropFiles={(files) => files[0] && runImport(files[0])}
      footer={
        <>
          <span className="mr-auto text-[12px] text-faint">
            {questions.length} savol · {totalPoints} ball
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Bekor
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* meta */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Test nomi">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Matematika — 1-chorak"
            />
          </Field>
          <Field label="Fan (ixtiyoriy)">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Matematika"
            />
          </Field>
          <Field label="Guruh">
            <select
              value={gid}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg/50 px-3.5 py-2.5 text-sm text-ink focus:border-accent/50 focus:outline-none"
            >
              {myGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Davomiyligi (daqiqa)">
            <Input
              type="number"
              min={1}
              max={600}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 1)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 text-[13px]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="accent-[rgb(var(--accent))]"
            />
            Savollarni aralashtirish
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="accent-[rgb(var(--accent))]"
            />
            Variantlarni aralashtirish
          </label>
        </div>

        {/* import — 2 bosqichda */}
        <div className="rounded-2xl border border-dashed border-accent/30 bg-accent-soft/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            <span className="text-[14px] font-semibold text-ink">
              Excel'dan import qilish
            </span>
            <span className="ml-auto text-[11px] font-medium text-faint">
              30 tagacha savol
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {/* 1-qadam */}
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent/40"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-accent">
                <Download className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-ink">
                  1. Namunani yuklab oling
                </span>
                <span className="block text-[11px] text-faint">
                  test-namuna.xlsx — tayyor jadval
                </span>
              </span>
            </button>

            {/* 2-qadam */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-3 rounded-xl border border-accent/40 bg-surface p-3 text-left transition-colors hover:brightness-[1.02]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink">
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-ink">
                  2. To'ldirilgan faylni yuklang
                </span>
                <span className="block text-[11px] text-faint">
                  .xlsx yoki .csv — bu yerga tashlang ham bo'ladi
                </span>
              </span>
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Ustunlar: <b className="text-ink">savol</b> · A · B · C · D ·{" "}
            <b className="text-ink">javob</b> (to'g'ri variant harfi: A, B, C yoki
            D). Har qatorga bitta savol yozing.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && runImport(e.target.files[0])}
          />
        </div>
        {importNote && (
          <p className="text-[12px] font-medium text-success">{importNote}</p>
        )}

        {/* questions */}
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.key}
              index={i}
              q={q}
              onChange={(d) => patch(q.key, d)}
              onRemove={() =>
                setQuestions((qs) => qs.filter((x) => x.key !== q.key))
              }
              onDuplicate={() =>
                setQuestions((qs) => {
                  const idx = qs.findIndex((x) => x.key === q.key);
                  const copy = { ...q, key: uid() };
                  const next = qs.slice();
                  next.splice(idx + 1, 0, copy);
                  return next;
                })
              }
            />
          ))}
        </div>

        {/* add buttons */}
        <div className="flex flex-wrap gap-2">
          {(["single", "boolean", "short"] as QType[]).map((t) => {
            const M = typeMeta[t];
            return (
              <button
                key={t}
                onClick={() => setQuestions((qs) => [...qs, blankQ(t)])}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent/40 hover:bg-elevated"
              >
                <M.icon className="h-4 w-4 text-accent" /> {M.label}
              </button>
            );
          })}
        </div>

        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function QuestionCard({
  index,
  q,
  onChange,
  onRemove,
  onDuplicate,
}: {
  index: number;
  q: DraftQ;
  onChange: (d: Partial<DraftQ>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const M = typeMeta[q.type];
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent-soft text-[12px] font-semibold text-accent">
          {index + 1}
        </span>
        <Badge tone="neutral">
          <M.icon className="h-3.5 w-3.5" /> {M.label}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 flex items-center gap-1 text-[11px] text-faint">
            ball
            <input
              type="number"
              min={1}
              value={q.points}
              onChange={(e) => onChange({ points: Number(e.target.value) || 1 })}
              className="w-12 rounded-md border border-border bg-bg/50 px-1.5 py-0.5 text-center text-[12px] text-ink focus:outline-none"
            />
          </span>
          <IconButton label="Nusxa" onClick={onDuplicate} className="h-7 w-7">
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label="O'chirish" onClick={onRemove} className="h-7 w-7">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <Textarea
        value={q.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Savol matni…"
        className="min-h-[60px]"
      />

      {q.type === "short" ? (
        <div className="mt-3">
          <Field label="To'g'ri javob" hint="katta-kichik harf farqlanmaydi">
            <Input
              value={q.correctText}
              onChange={(e) => onChange({ correctText: e.target.value })}
              placeholder="Masalan: 42"
            />
          </Field>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {q.options.map((opt, oi) => {
            const correct = q.correctIndex === oi;
            const editable = q.type === "single";
            return (
              <div key={oi} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ correctIndex: oi })}
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                    correct
                      ? "bg-success/15 text-success"
                      : "text-faint hover:bg-elevated"
                  )}
                  title="To'g'ri javob"
                >
                  {correct ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-elevated text-[13px] font-semibold text-muted">
                  {String.fromCharCode(65 + oi)}
                </span>
                <Input
                  value={opt}
                  disabled={!editable}
                  onChange={(e) => {
                    const options = q.options.slice();
                    options[oi] = e.target.value;
                    onChange({ options });
                  }}
                  placeholder={`${oi + 1}-variant`}
                  className={cn("flex-1", !editable && "opacity-70")}
                />
                {editable && q.options.length > 2 && (
                  <IconButton
                    label="Variantni o'chirish"
                    onClick={() => {
                      const options = q.options.filter((_, x) => x !== oi);
                      const correctIndex =
                        q.correctIndex === oi
                          ? 0
                          : q.correctIndex > oi
                          ? q.correctIndex - 1
                          : q.correctIndex;
                      onChange({ options, correctIndex });
                    }}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
            );
          })}
          {q.type === "single" && q.options.length < 6 && (
            <button
              onClick={() => onChange({ options: [...q.options, ""] })}
              className="inline-flex items-center gap-1.5 pl-10 text-[12px] font-medium text-accent hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" /> Variant qo'shish
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- convert helpers ----
function fromImported(q: NewTestQuestion): DraftQ {
  if (q.type === "short")
    return {
      key: uid(),
      type: "short",
      text: q.text,
      options: [],
      correctIndex: 0,
      correctText: q.correctText || "",
      points: q.points || 1,
    };
  return {
    key: uid(),
    type: q.type,
    text: q.text,
    options: (q.options || []).map((o) => o.text),
    correctIndex: q.correctIndex ?? 0,
    correctText: "",
    points: q.points || 1,
  };
}

function toNewQuestion(q: DraftQ): NewTestQuestion {
  if (q.type === "short")
    return { type: "short", text: q.text.trim(), correctText: q.correctText.trim(), points: q.points };
  return {
    type: q.type,
    text: q.text.trim(),
    options: q.options.filter((o) => o.trim()).map((o) => ({ text: o.trim() })),
    correctIndex: q.correctIndex,
    points: q.points,
  };
}
