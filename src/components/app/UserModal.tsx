"use client";

import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Monogram } from "@/components/ui/Monogram";
import { User } from "@/lib/types";
import { useData } from "@/store/data";

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  teacher: "O'qituvchi",
  student: "O'quvchi",
};

/** A lightweight profile card shown when a person is opened from search. */
export function UserModal({
  user,
  open,
  onClose,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
}) {
  const groups = useData((s) => s.groups);

  if (!user) return null;

  const theirGroups = groups.filter((g) =>
    user.role === "teacher"
      ? g.teacherId === user.id
      : g.studentIds.includes(user.id)
  );

  return (
    <Modal open={open} onClose={onClose} title="Profil">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="xl" />
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold text-ink">
              {user.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone="accent">{roleLabel[user.role]}</Badge>
              <span className="truncate font-mono text-[11px] text-faint">
                @{user.email}
              </span>
            </div>
            {user.headline && (
              <p className="mt-1.5 text-[13px] text-muted">{user.headline}</p>
            )}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">
            {user.role === "teacher" ? "O'qitadigan guruhlari" : "Guruhlari"}
          </p>
          {theirGroups.length === 0 ? (
            <p className="text-[13px] text-muted">Guruhlar yo'q.</p>
          ) : (
            <div className="space-y-1.5">
              {theirGroups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 px-3 py-2"
                >
                  <Monogram label={g.subject} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {g.name}
                    </span>
                    <span className="block truncate text-[11px] text-faint">
                      {g.subject}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
