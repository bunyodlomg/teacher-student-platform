"use client";

import { Avatar } from "@/components/ui/Avatar";
import { AttachmentChip } from "@/components/ui/Attachment";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Textarea, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { getAssignment, getUser } from "@/lib/selectors";
import { Submission } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { useData } from "@/store/data";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ReviewModal({
  submission,
  onClose,
}: {
  submission: Submission | null;
  onClose: () => void;
}) {
  const users = useData((s) => s.users);
  const assignments = useData((s) => s.assignments);
  const grade = useData((s) => s.gradeSubmission);

  const assignment = submission
    ? getAssignment(assignments, submission.assignmentId)
    : undefined;
  const student = submission ? getUser(users, submission.studentId) : undefined;

  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (submission && assignment) {
      setScore(submission.score ?? Math.round(assignment.points * 0.85));
      setFeedback(submission.feedback ?? "");
    }
  }, [submission, assignment]);

  const finish = (status: "approved" | "rejected") => {
    if (!submission) return;
    grade(submission.id, {
      status,
      score: status === "approved" ? score : undefined,
      feedback: feedback.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={!!submission}
      onClose={onClose}
      title="Ishni tekshirish"
      footer={
        <>
          <Button variant="danger" size="sm" onClick={() => finish("rejected")}>
            <X className="h-4 w-4" /> Tuzatishni so'rash
          </Button>
          <Button size="sm" onClick={() => finish("approved")}>
            <Check className="h-4 w-4" /> Tasdiqlash va baholash
          </Button>
        </>
      }
    >
      {submission && student && assignment && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar user={student} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{student.name}</p>
              <p className="text-[12px] text-faint">
                {submission.submittedAt ? relativeTime(submission.submittedAt) : "—"} topshirildi
              </p>
            </div>
            <Badge tone="accent">{assignment.title}</Badge>
          </div>

          <div className="rounded-xl border border-border bg-bg/40 p-4">
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted">
              {submission.body || "Yozma javob yo'q."}
            </p>
            {submission.attachments.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {submission.attachments.map((a) => (
                  <AttachmentChip key={a.id} attachment={a} />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Baho" hint={`/ ${assignment.points}`} className="col-span-1">
              <Input
                type="number"
                min={0}
                max={assignment.points}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
            </Field>
            <Field label="Izoh" className="col-span-2">
              <Input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Bitta aniq, xayrli va foydali izoh…"
              />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  );
}
