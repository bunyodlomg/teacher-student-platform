"use client";

import { Attachment, AttachmentKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileViewer, canPreview } from "@/components/ui/FileViewer";
import { useState, type ReactNode } from "react";
import {
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  AudioLines,
  Presentation,
  type LucideIcon,
} from "lucide-react";

const meta: Record<
  AttachmentKind,
  { icon: LucideIcon; label: string; tint: string }
> = {
  image: { icon: ImageIcon, label: "Rasm", tint: "text-fuchsia-500 bg-fuchsia-500/10" },
  video: { icon: Film, label: "Video", tint: "text-rose-500 bg-rose-500/10" },
  audio: { icon: AudioLines, label: "Audio", tint: "text-amber-500 bg-amber-500/10" },
  pdf: { icon: FileText, label: "PDF", tint: "text-red-500 bg-red-500/10" },
  doc: { icon: FileText, label: "Hujjat", tint: "text-sky-500 bg-sky-500/10" },
  slides: { icon: Presentation, label: "Slaydlar", tint: "text-orange-500 bg-orange-500/10" },
  link: { icon: Link2, label: "Havola", tint: "text-emerald-500 bg-emerald-500/10" },
};

export function AttachmentChip({
  attachment,
  className,
}: {
  attachment: Attachment;
  className?: string;
}) {
  const m = meta[attachment.kind];
  const Icon = m.icon;
  const cls = cn(
    "group flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-elevated",
    className
  );
  const inner = (
    <>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", m.tint)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-ink">
          {attachment.name}
        </span>
        <span className="block text-[11px] text-faint">
          {m.label}
          {attachment.meta ? ` · ${attachment.meta}` : ""}
        </span>
      </span>
    </>
  );

  // Brauzerda ko'rsatib bo'ladigan fayllar yuklab olinmaydi — platforma
  // ichida ochiladi (maktab kompyuterlarida disk to'lib ketmasligi uchun).
  if (attachment.url && canPreview(attachment)) {
    return (
      <PreviewChip attachment={attachment} className={cls}>
        {inner}
      </PreviewChip>
    );
  }

  // ko'rib bo'lmaydigan fayllar (zip, …) — yuklab olinadi
  if (attachment.url) {
    return (
      <a
        href={attachment.url}
        download={attachment.name}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={cls}>
      {inner}
    </button>
  );
}

function PreviewChip({
  attachment,
  className,
  children,
}: {
  attachment: Attachment;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("w-full", className)}
        title="Ko'rish"
      >
        {children}
      </button>
      <FileViewer
        file={open ? attachment : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export const attachmentMeta = meta;
