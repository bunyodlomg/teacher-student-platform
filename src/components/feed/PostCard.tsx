"use client";

import { Post } from "@/lib/types";
import { cn, relativeTime, dueLabel } from "@/lib/utils";
import { getAssignment, getUser } from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Send,
  SmilePlus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "../ui/Avatar";
import { PostAttachments } from "./PostAttachments";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { EditPostModal } from "./EditPostModal";
import { ClickSpark } from "@/components/reactbits";

const REACTIONS = ["❤️", "🔥", "💡", "👏", "🎧", "✍️"];

const typeMeta = {
  lesson: { label: "Dars", tone: "accent" as const },
  announcement: { label: "E'lon", tone: "warning" as const },
  assignment: { label: "Topshiriq", tone: "success" as const },
};

export function PostCard({
  post,
  index = 0,
}: {
  post: Post;
  index?: number;
}) {
  const userId = useSession((s) => s.currentUserId)!;
  const role = useSession((s) => s.role);
  const users = useData((s) => s.users);
  const assignments = useData((s) => s.assignments);
  const toggleReaction = useData((s) => s.toggleReaction);
  const addComment = useData((s) => s.addComment);
  const deletePost = useData((s) => s.deletePost);

  const author = getUser(users, post.authorId);
  const assignment = post.assignmentId
    ? getAssignment(assignments, post.assignmentId)
    : undefined;

  const [showComments, setShowComments] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const base = role === "teacher" ? "/teacher" : "/student";
  const meta = typeMeta[post.type];
  const canManage = role === "admin" || userId === post.authorId;

  if (!author) return null;

  return (
    <motion.article
      id={`post-${post.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow"
    >
      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <Avatar user={author} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">
              {author.name}
            </span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {post.pinned && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning">
                <Pin className="h-3 w-3" /> Mahkamlangan
              </span>
            )}
          </div>
          <span className="text-[12px] text-faint">
            {relativeTime(post.createdAt)}
          </span>
        </div>

        {canManage && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:bg-elevated hover:text-ink"
              aria-label="Post amallari"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lift"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-elevated"
                    >
                      <Pencil className="h-4 w-4 text-muted" /> Tahrirlash
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
                    >
                      <Trash2 className="h-4 w-4" /> O'chirish
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* body */}
      <div className="px-5 pb-1 pt-4">
        <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-ink text-balance">
          {post.title}
        </h3>
        <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-muted">
          {post.body}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-lg bg-elevated px-2.5 py-1 text-[12px] font-medium text-muted"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* attachments */}
      {post.attachments.length > 0 && (
        <PostAttachments attachments={post.attachments} className="px-5 py-3" />
      )}

      {/* assignment CTA */}
      {assignment && (
        <div className="px-5 py-3">
          <Link
            href={`${base}/assignments/${assignment.id}`}
            className="group flex items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent-soft/50 px-4 py-3 transition-colors hover:bg-accent-soft"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">
                {role === "student"
                  ? "Vazifa topshirish"
                  : "Vazifani ochish"}
              </p>
              <p className="text-[12px] text-muted">
                {dueLabel(assignment.dueDate).label} · {assignment.points} ball
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}

      {/* footer: reactions + comments */}
      <div className="flex items-center gap-1 border-t border-border px-3 py-2.5">
        <ClickSpark className="flex flex-wrap items-center gap-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {post.reactions.map((r) => {
              const mine = r.userIds.includes(userId);
              return (
                <motion.button
                  key={r.emoji}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  onClick={() => toggleReaction(post.id, r.emoji, userId)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[13px] transition-colors",
                    mine
                      ? "border-accent/30 bg-accent-soft text-accent"
                      : "border-border bg-surface text-muted hover:bg-elevated"
                  )}
                >
                  <motion.span
                    key={mine ? "on" : "off"}
                    animate={
                      mine
                        ? { scale: [1, 1.5, 1], rotate: [0, -12, 0] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.35 }}
                  >
                    {r.emoji}
                  </motion.span>
                  <motion.span
                    key={r.userIds.length}
                    initial={{ y: -6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="font-medium tabular-nums"
                  >
                    {r.userIds.length}
                  </motion.span>
                </motion.button>
              );
            })}
          </AnimatePresence>

          <div className="relative">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-full text-faint transition-colors hover:bg-elevated hover:text-ink"
              aria-label="Reaksiya qo'shish"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {showPicker && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowPicker(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute bottom-9 left-0 z-20 flex gap-1 rounded-xl border border-border bg-surface p-1.5 shadow-lift"
                  >
                    {REACTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          toggleReaction(post.id, e, userId);
                          setShowPicker(false);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-base transition-transform hover:scale-125 hover:bg-elevated"
                      >
                        {e}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </ClickSpark>

        <button
          onClick={() => setShowComments((v) => !v)}
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
            showComments ? "bg-elevated text-ink" : "text-muted hover:bg-elevated"
          )}
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments.length > 0 ? `${post.comments.length} ` : ""}Izoh
        </button>
      </div>

      {/* comments */}
      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-bg/30"
          >
            <div className="space-y-3 px-5 py-4">
              {post.comments.map((c) => {
                const cu = getUser(users, c.authorId);
                if (!cu) return null;
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar user={cu} size="xs" />
                    <div className="min-w-0">
                      <div className="rounded-2xl rounded-tl-sm bg-surface px-3 py-2 shadow-xs">
                        <span className="text-[12px] font-semibold text-ink">
                          {cu.name}
                        </span>
                        <p className="text-[13px] leading-snug text-muted">
                          {c.body}
                        </p>
                      </div>
                      <span className="ml-1 text-[11px] text-faint">
                        {relativeTime(c.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  addComment(post.id, userId, draft.trim());
                  setDraft("");
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Izoh yozing…"
                  className="h-9 flex-1 rounded-full border border-border bg-surface px-4 text-[13px] text-ink placeholder:text-faint focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-40"
                  aria-label="Izohni yuborish"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditPostModal
        post={editOpen ? post : null}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Postni o'chirish"
        description={
          post.assignmentId
            ? "Bu post va unga bog'langan topshiriq hamda topshirilgan ishlar butunlay o'chiriladi."
            : "Bu post butunlay o'chiriladi. Buni qaytarib bo'lmaydi."
        }
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await deletePost(post.id);
                setDeleting(false);
                setConfirmOpen(false);
              }}
            >
              {deleting ? "O'chirilmoqda…" : "O'chirish"}
            </Button>
          </>
        }
      >
        <p className="text-[14px] text-muted">
          “{post.title}” postini o'chirishni tasdiqlaysizmi?
        </p>
      </Modal>
    </motion.article>
  );
}
