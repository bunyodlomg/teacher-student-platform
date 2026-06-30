"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AttachmentChip } from "@/components/ui/Attachment";
import { Attachment, AttachmentKind, PostType } from "@/lib/types";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import {
  FileText,
  Film,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Presentation,
} from "lucide-react";
import { useState } from "react";

type Mode = "lesson" | "announcement" | "assignment";

const attachKinds: { kind: AttachmentKind; label: string; icon: typeof FileText }[] = [
  { kind: "pdf", label: "PDF", icon: FileText },
  { kind: "slides", label: "Slaydlar", icon: Presentation },
  { kind: "video", label: "Video", icon: Film },
  { kind: "audio", label: "Audio", icon: Mic },
  { kind: "image", label: "Rasm", icon: ImageIcon },
];

export function Composer({
  open,
  onClose,
  groupId,
  defaultMode = "lesson",
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  defaultMode?: Mode;
}) {
  const teacherId = useSession((s) => s.currentUserId)!;
  const addPost = useData((s) => s.addPost);
  const createAssignment = useData((s) => s.createAssignment);

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [points, setPoints] = useState(100);
  const [due, setDue] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);

  const reset = () => {
    setTitle("");
    setBody("");
    setTags("");
    setPoints(100);
    setDue("");
    setFiles([]);
  };

  const addFile = (kind: AttachmentKind) => {
    const ext: Record<AttachmentKind, string> = {
      pdf: "pdf",
      slides: "key",
      video: "mp4",
      audio: "m4a",
      image: "jpg",
      doc: "docx",
      link: "url",
    };
    setFiles((f) => [
      ...f,
      {
        id: `at_${Math.random().toString(36).slice(2, 7)}`,
        kind,
        name: `${(title || "material").trim().replace(/\s+/g, "_").slice(0, 18)}_${f.length + 1}.${ext[kind]}`,
        meta: "uploaded",
      },
    ]);
  };

  const canSubmit =
    title.trim() && (mode !== "assignment" || (due && points > 0));

  const submit = () => {
    if (!canSubmit) return;
    if (mode === "assignment") {
      createAssignment({
        groupId,
        authorId: teacherId,
        title: title.trim(),
        description: body.trim(),
        dueDate: due ? new Date(due).toISOString() : new Date().toISOString(),
        points,
        attachments: files,
      });
    } else {
      addPost({
        groupId,
        authorId: teacherId,
        type: mode as PostType,
        title: title.trim(),
        body: body.trim(),
        tags: tags
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        attachments: files,
      });
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Guruhingiz bilan ulashing"
      description="U guruh lentasida paydo bo'ladi va har bir o'quvchiga xabar beriladi."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSubmit}>
            {mode === "assignment" ? "Topshiriqni joylash" : "Chop etish"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          segments={[
            { value: "lesson", label: "Dars" },
            { value: "announcement", label: "E'lon" },
            { value: "assignment", label: "Topshiriq" },
          ]}
        />

        <Field label="Sarlavha">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              mode === "assignment"
                ? "masalan: Matn tahlili — 4-bob"
                : "Bu nima haqida?"
            }
            autoFocus
          />
        </Field>

        <Field label={mode === "assignment" ? "Ko'rsatmalar" : "Matn"}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              mode === "assignment"
                ? "O'quvchilar nima qilishi va qanday baholanishi kerak?"
                : "O'qishga arzigulik biror narsa yozing…"
            }
          />
        </Field>

        {mode === "assignment" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Muddati">
              <Input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </Field>
            <Field label="Ball">
              <Input
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </Field>
          </div>
        ) : (
          mode === "lesson" && (
            <Field label="Teglar" hint="vergul bilan ajrating">
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Ramz, Matn tahlili"
              />
            </Field>
          )
        )}

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink">
            <Paperclip className="h-3.5 w-3.5 text-faint" /> Material biriktirish
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attachKinds.map((k) => {
              const Icon = k.icon;
              return (
                <button
                  key={k.kind}
                  onClick={() => addFile(k.kind)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg/50 px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-ink"
                >
                  <Icon className="h-3.5 w-3.5" /> {k.label}
                </button>
              );
            })}
          </div>
          {files.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {files.map((a) => (
                <AttachmentChip key={a.id} attachment={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
