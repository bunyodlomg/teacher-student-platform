"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FileDrop } from "@/components/ui/FileDrop";
import { Modal } from "@/components/ui/Modal";
import { Attachment, Post } from "@/lib/types";
import { useData } from "@/store/data";
import { useState } from "react";

/** Edit a post's title, text, tags and attachments. */
export function EditPostModal({
  post,
  open,
  onClose,
}: {
  post: Post | null;
  open: boolean;
  onClose: () => void;
}) {
  const editPost = useData((s) => s.editPost);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // re-seed fields when a different post is opened
  const [syncKey, setSyncKey] = useState<string | null>(null);
  if (open && post && syncKey !== post.id) {
    setSyncKey(post.id);
    setTitle(post.title);
    setBody(post.body);
    setTags((post.tags ?? []).join(", "));
    setFiles(post.attachments ?? []);
    setError("");
  }
  if (!open && syncKey !== null) setSyncKey(null);

  if (!post) return null;

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    const res = await editPost(post.id, {
      title: title.trim(),
      body: body.trim(),
      tags: tags
        ? tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      attachments: files,
    });
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
      title="Postni tahrirlash"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !title.trim()}>
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Sarlavha">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Matn">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        {post.type === "lesson" && (
          <Field label="Teglar" hint="vergul bilan ajrating">
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ramz, Matn tahlili"
            />
          </Field>
        )}
        <FileDrop value={files} onChange={setFiles} />
        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
