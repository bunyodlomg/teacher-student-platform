"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { PostAttachments } from "@/components/feed/PostAttachments";
import { FileDrop } from "@/components/ui/FileDrop";
import { AddToCalendar } from "@/components/ui/AddToCalendar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Attachment } from "@/lib/types";
import {
  getAssignment,
  getGroup,
  submissionFor,
} from "@/lib/selectors";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { cn, dueLabel, formatDate, relativeTime } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Save,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function AssignmentDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const userId = useSession((s) => s.currentUserId)!;
  const assignments = useData((s) => s.assignments);
  const groups = useData((s) => s.groups);
  const submissions = useData((s) => s.submissions);
  const upsert = useData((s) => s.upsertSubmission);

  const assignment = getAssignment(assignments, id);
  const existing = submissionFor(submissions, id, userId);

  const [body, setBody] = useState(existing?.body ?? "");
  const [files, setFiles] = useState<Attachment[]>(existing?.attachments ?? []);
  const [justSaved, setJustSaved] = useState<"draft" | "submitted" | null>(null);

  if (!assignment) {
    return (
      <div className="py-20 text-center text-muted">Topshiriq topilmadi.</div>
    );
  }

  const group = getGroup(groups, assignment.groupId);
  const due = dueLabel(assignment.dueDate);
  const status = existing?.status ?? "not_started";
  const graded = status === "approved";
  const locked = graded;

  const save = (submit: boolean) => {
    upsert(id, userId, {
      body,
      attachments: files,
      status: submit ? "submitted" : "draft",
    });
    setJustSaved(submit ? "submitted" : "draft");
    setTimeout(() => setJustSaved(null), 2400);
  };

  return (
    <div>
      <Link
        href="/student/assignments"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha topshiriqlar
      </Link>

      <PageHeader
        eyebrow={group?.name}
        title={assignment.title}
        action={
          <div className="flex items-center gap-2">
            <AddToCalendar
              event={{
                title: assignment.title,
                details: assignment.description,
                due: assignment.dueDate,
              }}
            />
            <StatusBadge status={status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Topshiriq sharti */}
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={due.tone === "over" ? "danger" : due.tone === "soon" ? "warning" : "neutral"} dot>
                {due.label}
              </Badge>
              <Badge tone="accent">{assignment.points} ball</Badge>
              <span className="text-[12px] text-faint">
                {relativeTime(assignment.createdAt)} joylandi
              </span>
            </div>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted">
              {assignment.description}
            </p>
            {assignment.attachments.length > 0 && (
              <PostAttachments
                attachments={assignment.attachments}
                className="mt-4"
              />
            )}
          </div>

          {/* Izoh */}
          {graded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-success/30 bg-success/5 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-display font-semibold text-ink">
                  <CheckCircle2 className="h-5 w-5 text-success" /> Baholandi
                </span>
                <span className="font-display text-2xl font-semibold text-success">
                  {existing?.score}
                  <span className="text-base text-muted">/{assignment.points}</span>
                </span>
              </div>
              {existing?.feedback && (
                <p className="mt-3 text-[14px] leading-relaxed text-muted">
                  “{existing.feedback}”
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Topshirish */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="font-display text-sm font-semibold text-ink">
                {graded ? "Topshirgan ishingiz" : "Ishingiz"}
              </h3>
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Javobingizni yozing yoki ilovalaringizga izoh qo'shing…"
              disabled={locked}
              className="min-h-[140px]"
            />

            {/* locked (graded): read-only view of what was submitted */}
            {locked && files.length > 0 && (
              <PostAttachments attachments={files} className="mt-3" />
            )}

            {!locked && (
              <>
                <div className="mt-3">
                  <FileDrop value={files} onChange={setFiles} />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => save(false)}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4" /> Qoralama saqlash
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => save(true)}
                    disabled={!body.trim() && files.length === 0}
                    className="flex-1"
                  >
                    {status === "submitted" ? "Yangilash" : "Topshirish"}
                  </Button>
                </div>
              </>
            )}

            {justSaved && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-3 text-center text-[12px] font-medium",
                  justSaved === "submitted" ? "text-success" : "text-muted"
                )}
              >
                {justSaved === "submitted"
                  ? "Topshirildi — o'qituvchingizga xabar berildi."
                  : "Qoralama saqlandi."}
              </motion.p>
            )}

            {existing?.updatedAt && (
              <p className="mt-3 text-center text-[11px] text-faint">
                So'nggi tahrir: {relativeTime(existing.updatedAt)} · muddati{" "}
                {formatDate(assignment.dueDate)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
