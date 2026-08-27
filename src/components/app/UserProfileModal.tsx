"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Monogram } from "@/components/ui/Monogram";
import { User } from "@/lib/types";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { useChat } from "@/store/chat";
import { useRouter } from "next/navigation";
import { groupsForUser } from "@/lib/selectors";
import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  teacher: "O'qituvchi",
  student: "O'quvchi",
};

/**
 * Read-only profile card for another user — opened by clicking their avatar in
 * a group. Shows who they are, the groups they belong to, and a shortcut to
 * start a private chat (when allowed).
 */
export function UserProfileModal({
  user,
  open,
  onClose,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const me = useSession((s) => s.user);
  const role = useSession((s) => s.role);
  const groups = useData((s) => s.groups);
  const startDirect = useChat((s) => s.startDirect);
  const setActive = useChat((s) => s.setActive);
  const [busy, setBusy] = useState(false);

  const theirGroups = useMemo(
    () => (user ? groupsForUser(groups, user.id, user.role) : []),
    [groups, user]
  );

  if (!user) return null;

  const isMe = me?.id === user.id;
  const base =
    role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";

  const message = async () => {
    setBusy(true);
    const convId = await startDirect(user.id);
    setBusy(false);
    if (convId) {
      setActive(convId);
      router.push(`${base}/chat`);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-sm">
      <div className="flex flex-col items-center text-center">
        <Avatar user={user} size="xl" />
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">
          {user.name}
        </h2>
        <span className="mt-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-medium text-accent">
          {roleLabel[user.role]}
        </span>
        {user.headline && (
          <p className="mt-2 text-[14px] text-muted">{user.headline}</p>
        )}
        <p className="mt-1 font-mono text-[12px] text-faint">@{user.email}</p>
      </div>

      {theirGroups.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Guruhlar
          </p>
          <div className="space-y-1">
            {theirGroups.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
              >
                <Monogram label={g.subject} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {g.name}
                  </p>
                  <p className="truncate text-[11px] text-faint">{g.subject}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isMe && (
        <Button className="mt-6 w-full" onClick={message} disabled={busy}>
          <MessageCircle className="h-4 w-4" />
          {busy ? "Ochilmoqda…" : "Shaxsiy xabar yozish"}
        </Button>
      )}
    </Modal>
  );
}
