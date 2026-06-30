"use client";

import { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentChip } from "@/components/ui/Attachment";
import { DocumentFolder } from "./DocumentFolder";
import { Lightbox } from "@/components/ui/Lightbox";
import { VoiceMessage } from "@/components/media/VoiceMessage";
import { Maximize2 } from "lucide-react";
import { useState } from "react";

/**
 * Renders a post's attachments richly:
 *  - images  → inline thumbnails that open larger in a Lightbox (no download)
 *  - audio   → inline player (record/listen in place)
 *  - video   → inline player
 *  - others  → file chips that open/preview in a new tab
 */
export function PostAttachments({
  attachments,
  className,
}: {
  attachments: Attachment[];
  className?: string;
}) {
  const [lightbox, setLightbox] = useState<Attachment | null>(null);
  if (!attachments.length) return null;

  const images = attachments.filter((a) => a.kind === "image" && a.url);
  const audios = attachments.filter((a) => a.kind === "audio" && a.url);
  const videos = attachments.filter((a) => a.kind === "video" && a.url);
  const files = attachments.filter(
    (a) => !["image", "audio", "video"].includes(a.kind) || !a.url
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* images */}
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          {images.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setLightbox(a)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-elevated"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.name}
                loading="lazy"
                className={cn(
                  "w-full transition-transform duration-300 group-hover:scale-[1.02]",
                  images.length === 1
                    ? "max-h-[34rem] object-contain"
                    : "h-44 object-cover"
                )}
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="pointer-events-none absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-black/40 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* video */}
      {videos.map((a) => (
        <video
          key={a.id}
          src={a.url}
          controls
          preload="metadata"
          className="w-full rounded-2xl border border-border bg-black"
        />
      ))}

      {/* audio — Telegram-style voice message */}
      {audios.map((a) => (
        <VoiceMessage key={a.id} src={a.url!} name={a.name} />
      ))}

      {/* other files — grouped into an openable folder when there are a few */}
      {files.length === 1 && <AttachmentChip attachment={files[0]} />}
      {files.length > 1 && <DocumentFolder files={files} />}

      <Lightbox
        open={!!lightbox}
        src={lightbox?.url ?? null}
        name={lightbox?.name}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
