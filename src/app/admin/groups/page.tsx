"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { ManageMembersModal } from "@/components/app/ManageMembersModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Monogram } from "@/components/ui/Monogram";
import { getUser } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { Group } from "@/lib/types";
import { Aurora, Stagger, StaggerItem, SpotlightCard } from "@/components/motion";
import { useData } from "@/store/data";
import { Plus, Users } from "lucide-react";
import { useState } from "react";

export default function AdminGroups() {
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);
  const assignments = useData((s) => s.assignments);
  const addGroup = useData((s) => s.addGroup);

  const teachers = users.filter((u) => u.role === "teacher");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  // member management (shared modal)
  const [editing, setEditing] = useState<Group | null>(null);

  const create = async () => {
    if (!name.trim() || !subject.trim() || !teacherId || busy) return;
    setBusy(true);
    setFormError("");
    const res = await addGroup({
      name: name.trim(),
      subject: subject.trim(),
      description: description.trim(),
      teacherId,
    });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error || "Xatolik yuz berdi");
      return;
    }
    setName("");
    setSubject("");
    setDescription("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow="Guruhlar"
        title="O'quv guruhlari"
        subtitle="Guruhlarni yarating va o'qituvchilarni biriktiring."
        gradient
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Yangi guruh
          </Button>
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2" inView>
        {groups.map((g) => {
          const teacher = getUser(users, g.teacherId);
          const groupAssignments = assignments.filter((a) => a.groupId === g.id).length;
          return (
            <StaggerItem key={g.id}>
            <SpotlightCard className="h-full rounded-2xl border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-lift">
              <div className="flex items-start gap-3">
                <Monogram label={g.subject} size="lg" accent />
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">{g.subject}</p>
                  <h3 className="font-display text-lg font-medium text-ink">
                    {g.name}
                  </h3>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-muted">
                {g.description}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  {teacher && <Avatar user={teacher} size="xs" />}
                  <span className="text-[12px] text-muted">{teacher?.name}</span>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-faint">
                  {g.studentIds.length} o'quvchi · {groupAssignments} topshiriq
                </span>
              </div>
              <button
                onClick={() => setEditing(g)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg/40 px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-ink"
              >
                <Users className="h-4 w-4" /> O'quvchilarni boshqarish
              </button>
            </SpotlightCard>
            </StaggerItem>
          );
        })}
      </Stagger>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Yangi guruh"
        description="Guruh yarating va unga o'qituvchi biriktiring."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              onClick={create}
              disabled={!name.trim() || !subject.trim() || !teacherId || busy}
            >
              <Plus className="h-4 w-4" /> {busy ? "Saqlanmoqda…" : "Yaratish"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-[13px] font-medium text-danger">{formError}</p>
          )}
          <Field label="Guruh nomi">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="masalan: IELTS — Advanced" autoFocus />
          </Field>
          <Field label="Yo'nalish">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="masalan: IELTS tayyorgarlik" />
          </Field>
          <Field label="Tavsif" hint="ixtiyoriy">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Guruh haqida qisqacha…" />
          </Field>
          <Field label="O'qituvchi">
            <div className="flex flex-wrap gap-2">
              {teachers.map((t) => (
                <button
                  key={t.id}
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
        </div>
      </Modal>

      <ManageMembersModal
        group={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
