"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Group } from "@/lib/types";
import { useData } from "@/store/data";
import { toast } from "@/store/toast";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState } from "react";

/**
 * Edit a group's details, or delete it. Available to the owning teacher (and
 * admin). Saving/deleting goes through useData → /api/groups/[id].
 */
export function EditGroupModal({
  group,
  open,
  onClose,
  /** where to send the user after a successful delete */
  redirectTo,
}: {
  group: Group | null;
  open: boolean;
  onClose: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const updateGroup = useData((s) => s.updateGroup);
  const deleteGroup = useData((s) => s.deleteGroup);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // re-sync fields whenever a different group is opened
  const [syncKey, setSyncKey] = useState<string | null>(null);
  if (group && open && syncKey !== group.id) {
    setSyncKey(group.id);
    setName(group.name);
    setSubject(group.subject);
    setDescription(group.description ?? "");
    setError("");
  }
  if (!open && syncKey !== null) setSyncKey(null);

  const save = async () => {
    if (!group || !name.trim() || !subject.trim()) return;
    setSaving(true);
    setError("");
    const res = await updateGroup(group.id, {
      name: name.trim(),
      subject: subject.trim(),
      description: description.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Saqlashda xatolik");
      return;
    }
    toast.success("Guruh yangilandi");
    onClose();
  };

  const remove = async () => {
    if (!group) return;
    const res = await deleteGroup(group.id);
    if (!res.ok) {
      toast.error(res.error || "O'chirishda xatolik");
      return;
    }
    toast.success("Guruh o'chirildi");
    onClose();
    if (redirectTo) router.replace(redirectTo);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Guruhni tahrirlash"
        description="Guruh ma'lumotlarini o'zgartiring yoki o'chiring."
        footer={
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4" /> O'chirish
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving || !name.trim() || !subject.trim()}
            >
              {saving ? "Saqlanmoqda…" : "Saqlash"}
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
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Yo'nalish">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Tavsif" hint="ixtiyoriy">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[64px]"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Guruhni o'chirish"
        body={
          <>
            <span className="font-semibold text-ink">{group?.name}</span> guruhi,
            uning barcha postlari, topshiriqlari, testlari va chati butunlay
            o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.
          </>
        }
        confirmLabel="O'chirish"
        busyLabel="O'chirilmoqda…"
      />
    </>
  );
}
