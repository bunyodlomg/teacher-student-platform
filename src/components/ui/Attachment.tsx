"use client";

import { Attachment, AttachmentKind } from "@/lib/types";
import { cn } from "@/lib/utils";
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
  return (
    <button
      type="button"
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-elevated",
        className
      )}
    >
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
    </button>
  );
}

export const attachmentMeta = meta;
