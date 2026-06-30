"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { useMemo, useState } from "react";

/** Lets a teacher or student create their own group. */
export function CreateGroupModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const role = useSession((s) => s.role);
  const users = useData((s) => s.users);
  const createGroup = useData((s) => s.createGroup);

  const teachers = useMemo(() => users.filter((u) => u.role === "teacher"), [users]);
  const students = useMemo(() => users.filter((u) => u.role === "student"), [users]);
  const needsTeacher = role !== "teacher";

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [showStudents, setShowStudents] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setSubject("");
    setDescription("");
    setTeacherId("");
    setPicked(new Set());
    setShowStudents(false);
    setError("");
  };

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submit = async () => {
    if (!name.trim() || !subject.trim()) return;
    if (needsTeacher && !teacherId) {
      setError("O'qituvchini tanlang");
      return;
    }
    setBusy(true);
    setError("");
    const res = await createGroup({
      name: name.trim(),
      subject: subject.trim(),
      description: description.trim(),
      teacherId: needsTeacher ? teacherId : undefined,
      studentIds: [...picked],
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "Xatolik yuz berdi");
      return;
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yangi guruh"
      description="O'z guruhingizni yarating va a'zolarni qo'shing."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={busy || !name.trim() || !subject.trim()}
          >
            {busy ? "Yaratilmoqda…" : "Yaratish"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <Field label="Guruh nomi">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="masalan: IELTS — Advanced"
            autoFocus
          />
        </Field>
        <Field label="Yo'nalish">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="masalan: IELTS tayyorgarlik"
          />
        </Field>
        <Field label="Tavsif" hint="ixtiyoriy">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[64px]"
            placeholder="Guruh haqida qisqacha…"
          />
        </Field>

        {needsTeacher && (
          <Field label="O'qituvchi">
            <div className="flex flex-wrap gap-2">
              {teachers.length === 0 && (
                <p className="text-[12px] text-muted">
                  O'qituvchilar topilmadi.
                </p>
              )}
              {teachers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTeacherId(t.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
                    teacherId === t.id
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-border text-muted hover:bg-elevated hover:text-ink"
                  )}
                >
                  <Avatar user={t} size="xs" />
                  {t.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        {/* optional students */}
        <div className="rounded-xl border border-border p-3">
          <button
            type="button"
            onClick={() => setShowStudents((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-[13px] font-semibold text-ink">
              O'quvchilar qo'shish
            </span>
            <span className="text-[12px] text-muted">{picked.size} tanlandi</span>
          </button>
          {showStudents && (
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto border-t border-border pt-2">
              {students.length === 0 && (
                <p className="py-3 text-center text-[12px] text-muted">
                  O'quvchilar yo'q.
                </p>
              )}
              {students.map((st) => {
                const on = picked.has(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => toggle(st.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      on
                        ? "border-accent/40 bg-accent-soft"
                        : "border-border hover:bg-elevated"
                    )}
                  >
                    <Avatar user={st} size="xs" />
                    <span className="flex-1 truncate text-[13px] text-ink">
                      {st.name}
                    </span>
                    <span
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded border text-[10px]",
                        on
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-border text-transparent"
                      )}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
