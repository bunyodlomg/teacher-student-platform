"use client";

import { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { attachmentMeta } from "./Attachment";
import { VoiceRecorder } from "@/components/media/VoiceRecorder";
import { VoiceMessage } from "@/components/media/VoiceMessage";

/**
 * Drag-and-drop + click-to-pick file uploader. Each dropped file is POSTed to
 * /api/upload and the returned Attachment is appended. Controlled via
 * `value` / `onChange`.
 */
export function FileDrop({
  value,
  onChange,
  hint = "PDF, rasm, video, audio, hujjat — 25 MB gacha",
}: {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(0); // count of in-flight uploads
  const [error, setError] = useState("");

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setError("");
    setBusy((b) => b + list.length);
    for (const file of list) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.attachment) {
          onChange([...value, data.attachment as Attachment]);
        } else {
          setError(data?.error || `"${file.name}" yuklanmadi`);
        }
      } catch {
        setError(`"${file.name}" yuklanmadi`);
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };

  const remove = (id: string) => onChange(value.filter((a) => a.id !== id));

  const pickWith = (accept: string) => {
    if (!inputRef.current) return;
    inputRef.current.accept = accept;
    inputRef.current.click();
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <Paperclip className="h-3.5 w-3.5 text-faint" /> Material biriktirish
      </div>

      {/* Telegram-style quick attach */}
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => pickWith("image/*,video/*")}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent/40 hover:bg-elevated"
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-fuchsia-500/10 text-fuchsia-500">
            <ImageIcon className="h-4 w-4" />
          </span>
          Rasm yoki video
        </button>
        <button
          type="button"
          onClick={() => pickWith(".pdf,.doc,.docx,.ppt,.pptx,.txt,.xls,.xlsx")}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent/40 hover:bg-elevated"
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-sky-500/10 text-sky-500">
            <FileText className="h-4 w-4" />
          </span>
          Hujjat
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => pickWith("")}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          dragging
            ? "border-accent bg-accent-soft"
            : "border-border bg-bg/40 hover:border-accent/40 hover:bg-elevated"
        )}
      >
        <motion.span
          animate={dragging ? { y: -3, scale: 1.08 } : { y: 0, scale: 1 }}
          className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"
        >
          <UploadCloud className="h-5 w-5" strokeWidth={1.9} />
        </motion.span>
        <span className="text-[13px] font-medium text-ink">
          Fayllarni shu yerga tashlang yoki{" "}
          <span className="text-accent">tanlang</span>
        </span>
        <span className="text-[11px] text-faint">{hint}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Telegram-style voice recorder */}
      <VoiceRecorder onRecorded={(f) => upload([f])} className="mt-2" />

      {error && (
        <p className="mt-2 text-[12px] font-medium text-danger">{error}</p>
      )}

      {(value.length > 0 || busy > 0) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {value.map((a) => {
              const m = attachmentMeta[a.kind];
              const Icon = m.icon;
              const isAudio = a.kind === "audio" && a.url;
              const isImage = a.kind === "image" && a.url;

              if (isAudio) {
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="flex items-center gap-2 sm:col-span-2"
                  >
                    <VoiceMessage src={a.url!} name={a.name} className="flex-1" />
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      aria-label="O'chirish"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={a.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="group rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt={a.name}
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                          m.tint
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {a.name}
                      </span>
                      <span className="block text-[11px] text-faint">
                        {m.label}
                        {a.meta ? ` · ${a.meta}` : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      aria-label="O'chirish"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {busy > 0 &&
            Array.from({ length: busy }).map((_, i) => (
              <div
                key={`up-${i}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-accent">
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                </span>
                <span className="text-[13px] font-medium text-muted">
                  Yuklanmoqda…
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
