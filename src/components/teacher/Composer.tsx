"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { FileDrop, FileDropHandle } from "@/components/ui/FileDrop";
import { ClickSpark, StarBorder, Magnetic } from "@/components/reactbits";
import { Attachment, PostType } from "@/lib/types";
import { looksLikeHtml, textToHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { BookOpen, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const BODY_MAX = 4000;

export function Composer({
  open,
  onClose,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
}) {
  const teacherId = useSession((s) => s.currentUserId)!;
  const addPost = useData((s) => s.addPost);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [showError, setShowError] = useState(false);
  const fileDropRef = useRef<FileDropHandle>(null);

  const draftKey = `cl-draft:${groupId}`;

  // hydrate draft when opened
  useEffect(() => {
    if (!open) return;
    setShowError(false);
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setTitle(d.title ?? "");
        setBody(
          d.body ? (looksLikeHtml(d.body) ? d.body : textToHtml(d.body)) : ""
        );
        setTags(d.tags ?? "");
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId]);

  // persist draft (title/body/tags) while typing
  useEffect(() => {
    if (!open) return;
    if (!title && !body && !tags) {
      localStorage.removeItem(draftKey);
      return;
    }
    localStorage.setItem(draftKey, JSON.stringify({ title, body, tags }));
  }, [open, draftKey, title, body, tags]);

  const reset = () => {
    setTitle("");
    setBody("");
    setTags("");
    setFiles([]);
    setShowError(false);
    localStorage.removeItem(draftKey);
  };

  const canSubmit = title.trim().length > 0;

  const submit = () => {
    if (!canSubmit) {
      setShowError(true);
      return;
    }
    addPost({
      groupId,
      authorId: teacherId,
      type: "lesson" as PostType,
      title: title.trim(),
      body: body.trim(),
      tags: tags
        ? tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      attachments: files,
    });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="sm:max-w-2xl"
      title="Yangi dars ulashish"
      description="Dars guruh lentasida paydo bo'ladi va har bir o'quvchiga xabar beriladi."
      onDropFiles={(f) => fileDropRef.current?.addFiles(f)}
      footer={
        <>
          {showError && !canSubmit && (
            <span className="mr-auto text-[12px] font-medium text-danger">
              Sarlavhani to'ldiring
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Magnetic strength={0.25}>
            <StarBorder
              onClick={submit}
              className={cn(!canSubmit && "opacity-60")}
              innerClassName="flex items-center gap-2 px-5 py-2 text-[14px]"
            >
              <Send className="h-4 w-4" />
              Chop etish
            </StarBorder>
          </Magnetic>
        </>
      }
    >
      <ClickSpark className="space-y-3.5">
        <div className="flex items-center gap-2 rounded-lg bg-accent-soft/50 px-3 py-2 text-[12px] text-accent">
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          Dars materiali, izoh yoki resurs ulashing.
        </div>

        <Field label="Sarlavha">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bu dars nima haqida?"
            autoFocus
          />
        </Field>

        <Field label="Matn" hint="Formatlash paneli · ⌘/Ctrl+Enter — chop etish">

          <RichTextArea
            value={body}
            onChange={setBody}
            onSubmit={submit}
            maxLength={BODY_MAX}
            placeholder="O'qishga arzigulik biror narsa yozing…"
          />
        </Field>

        <Field label="Teglar" hint="vergul bilan ajrating">
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Ramz, Matn tahlili"
          />
        </Field>

        <FileDrop ref={fileDropRef} value={files} onChange={setFiles} />
      </ClickSpark>
    </Modal>
  );
}
