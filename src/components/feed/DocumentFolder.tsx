"use client";

import { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentChip } from "@/components/ui/Attachment";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";

/** A folder that opens to reveal its documents — each downloadable. */
export function DocumentFolder({ files }: { files: Attachment[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-elevated"
      >
        <motion.span
          animate={{ rotate: open ? -6 : 0, y: open ? -1 : 0 }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"
        >
          {open ? (
            <FolderOpen className="h-[18px] w-[18px]" />
          ) : (
            <Folder className="h-[18px] w-[18px]" />
          )}
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink">
            Hujjatlar
          </span>
          <span className="block text-[11px] text-faint">
            {files.length} ta fayl · ochish uchun bosing
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-faint transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border bg-bg/30"
          >
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {files.map((a) => (
                <div key={a.id} className="relative">
                  <AttachmentChip attachment={a} />
                  {a.url && (
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint">
                      <Download className="h-4 w-4" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
