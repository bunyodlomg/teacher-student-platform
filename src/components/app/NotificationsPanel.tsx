"use client";

import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { AnimatePresence, motion } from "framer-motion";
import { cn, relativeTime } from "@/lib/utils";
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCheck,
  GraduationCap,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { NotificationType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { EmptyState } from "../ui/EmptyState";

const iconFor: Record<NotificationType, typeof Bell> = {
  lesson: BookOpen,
  assignment: Sparkles,
  deadline: CalendarClock,
  feedback: MessageCircle,
  grade: GraduationCap,
  comment: MessageCircle,
  announcement: Bell,
};

const tintFor: Record<NotificationType, string> = {
  lesson: "text-sky-500 bg-sky-500/10",
  assignment: "text-accent bg-accent-soft",
  deadline: "text-amber-500 bg-amber-500/10",
  feedback: "text-violet-500 bg-violet-500/10",
  grade: "text-emerald-500 bg-emerald-500/10",
  comment: "text-fuchsia-500 bg-fuchsia-500/10",
  announcement: "text-rose-500 bg-rose-500/10",
};

export function NotificationsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const userId = useSession((s) => s.currentUserId);
  const notifications = useData((s) => s.notifications);
  const markRead = useData((s) => s.markNotificationRead);
  const markAllRead = useData((s) => s.markAllRead);

  const mine = notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-display text-sm font-semibold text-ink">
                Bildirishnomalar
              </span>
              <button
                onClick={() => userId && markAllRead(userId)}
                className="flex items-center gap-1.5 text-[12px] font-medium text-muted transition-colors hover:text-accent"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Hammasini o'qildi
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-1.5">
              {mine.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Bell}
                    title="Hammasi joyida"
                    description="Yangi darslar, baholar va muddatlar shu yerda paydo bo'ladi."
                  />
                </div>
              ) : (
                mine.map((n) => {
                  const Icon = iconFor[n.type];
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        markRead(n.id);
                        if (n.link) router.push(n.link);
                        onClose();
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-elevated",
                        !n.read && "bg-accent-soft/40"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                          tintFor[n.type]
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-ink">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          )}
                        </span>
                        <span className="block text-[12px] leading-snug text-muted">
                          {n.body}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-faint">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
