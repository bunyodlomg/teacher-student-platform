"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Field";
import { Group } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useData } from "@/store/data";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Shared student-roster editor. Used by admins (any group) and by the owning
 * teacher (their own group). Saves through useData.updateGroupMembers, which
 * targets /api/groups/[id]/members and live-refreshes affected users.
 */
export function ManageMembersModal({
  group,
  open,
  onClose,
}: {
  group: Group | null;
  open: boolean;
  onClose: () => void;
}) {
  const users = useData((s) => s.users);
  const updateGroupMembers = useData((s) => s.updateGroupMembers);
  const students = useMemo(
    () => users.filter((u) => u.role === "student"),
    [users]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // re-sync selection whenever a different group is opened
  const [syncKey, setSyncKey] = useState<string | null>(null);
  if (group && open && syncKey !== group.id) {
    setSyncKey(group.id);
    setSelected(new Set(group.studentIds));
    setQuery("");
    setError("");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const save = async () => {
    if (!group) return;
    setSaving(true);
    setError("");
    const res = await updateGroupMembers(group.id, [...selected]);
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Saqlashda xatolik");
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? `${group.name} — o'quvchilar` : "O'quvchilar"}
      description="Guruhga o'quvchilarni qo'shing yoki olib tashlang."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saqlanmoqda…" : `Saqlash (${selected.size})`}
          </Button>
        </>
      }
    >
      {error && (
        <p className="mb-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="O'quvchini qidiring…"
          className="pl-9"
        />
      </div>

      <div className="max-h-[46vh] space-y-1 overflow-y-auto">
        {students.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">
            Hali o'quvchilar yo'q. Avval administrator foydalanuvchi qo'shishi
            kerak.
          </p>
        )}
        {students.length > 0 && filtered.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">
            Hech narsa topilmadi.
          </p>
        )}
        {filtered.map((st) => {
          const on = selected.has(st.id);
          return (
            <button
              key={st.id}
              onClick={() => toggle(st.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                on
                  ? "border-accent/40 bg-accent-soft"
                  : "border-border hover:bg-elevated"
              )}
            >
              <Avatar user={st} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {st.name}
                </span>
                <span className="block truncate font-mono text-[11px] text-faint">
                  {st.email}
                </span>
              </span>
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-md border text-[11px]",
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
    </Modal>
  );
}
