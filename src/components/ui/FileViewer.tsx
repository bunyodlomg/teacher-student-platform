"use client";

import { Attachment } from "@/lib/types";
import { attachmentMeta } from "@/components/ui/Attachment";
import { VoiceMessage } from "@/components/media/VoiceMessage";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileQuestion, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Media ustida "saqlash" kontekst menyusini bloklaydi (yuklab olishni kamaytirish). */
const blockSave = (e: React.SyntheticEvent) => e.preventDefault();

/**
 * Faylni platforma ichida, yuklab olmasdan ko'rsatadi.
 *
 * Maktab kompyuterlarida har bir material Downloads'ga tushsa disk to'lib
 * ketadi — shu sabab fayl chiplari endi shu oynani ochadi:
 *  - PDF          → brauzerning o'z PDF ko'ruvchisi (iframe)
 *  - Word/slaydlar → serverda PDF'ga aylantirilgan nusxa (/uploads/preview/…)
 *  - Excel/CSV    → jadval (SheetJS)
 *  - TXT          → matn
 *  - rasm/video/audio → o'rnatilgan pleyer
 * Yuklab olish tugmasi baribir bor, lekin ixtiyoriy.
 */

const OFFICE_EXT = new Set(["doc", "docx", "rtf", "odt", "ppt", "pptx", "odp", "key"]);
const SHEET_EXT = new Set(["xls", "xlsx", "csv"]);
const MAX_ROWS = 2000;

type Mode = "pdf" | "office" | "sheet" | "text" | "image" | "video" | "audio" | "none";

function extOf(a: Attachment): string {
  const src = (a.url || a.name).split("?")[0];
  return (src.split(".").pop() || "").toLowerCase();
}

function modeFor(a: Attachment): Mode {
  const ext = extOf(a);
  if (a.kind === "image") return "image";
  if (a.kind === "video") return "video";
  if (a.kind === "audio") return "audio";
  if (ext === "pdf" || a.kind === "pdf") return "pdf";
  if (OFFICE_EXT.has(ext)) return "office";
  if (SHEET_EXT.has(ext)) return "sheet";
  if (ext === "txt") return "text";
  return "none";
}

/** Brauzer ichida ko'rsatib bo'ladimi (chipda "Ko'rish" belgisini tanlash uchun). */
export function canPreview(a: Attachment): boolean {
  return !!a.url && modeFor(a) !== "none";
}

export function FileViewer({
  file,
  onClose,
}: {
  file: Attachment | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [file, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {file && file.url && (
        <motion.div
          key="file-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[110] flex flex-col bg-black/70 p-2 backdrop-blur-sm sm:p-4"
        >
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border shadow-lift"
            role="dialog"
            aria-modal="true"
            aria-label={file.name}
          >
            <Header file={file} onClose={onClose} />
            <div className="relative min-h-0 flex-1 bg-bg/60">
              <Body file={file} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function Header({ file, onClose }: { file: Attachment; onClose: () => void }) {
  const m = attachmentMeta[file.kind];
  const Icon = m.icon;
  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", m.tint)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{file.name}</p>
        <p className="text-[11px] text-faint">
          {m.label}
          {file.meta ? ` · ${file.meta}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-ink"
        aria-label="Yopish"
        title="Yopish (Esc)"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function Body({ file }: { file: Attachment }) {
  const url = file.url!;
  switch (modeFor(file)) {
    case "pdf":
      return <PdfFrame src={url} title={file.name} />;
    case "office":
      return <OfficePreview file={file} />;
    case "sheet":
      return <SheetPreview file={file} />;
    case "text":
      return <TextPreview url={url} />;
    case "image":
      return (
        <div className="grid h-full place-items-center overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={file.name}
            draggable={false}
            onContextMenu={blockSave}
            className="max-h-full max-w-full select-none rounded-lg object-contain"
          />
        </div>
      );
    case "video":
      return (
        <div className="grid h-full place-items-center bg-black">
          <video
            src={url}
            controls
            autoPlay
            controlsList="nodownload"
            disablePictureInPicture
            onContextMenu={blockSave}
            className="max-h-full max-w-full"
          />
        </div>
      );
    case "audio":
      // Custom pleyer — native "yuklab olish" menyusi bo'lmaydi.
      return (
        <div className="grid h-full place-items-center p-6">
          <VoiceMessage src={url} name={file.name} className="w-full max-w-md" />
        </div>
      );
    default:
      return (
        <Notice
          title="Bu faylni brauzerda ko'rib bo'lmaydi"
          text="Faylni ochish uchun uni yuklab olishingiz kerak."
          file={file}
        />
      );
  }
}

function PdfFrame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={`${src}#view=FitH`}
      title={title}
      className="h-full w-full border-0 bg-white"
    />
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div>
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-accent" />
        <p className="mt-3 text-[13px] text-muted">{text}</p>
      </div>
    </div>
  );
}

function Notice({ title, text, file }: { title: string; text: string; file: Attachment }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <FileQuestion className="h-7 w-7" />
        </span>
        <p className="mt-4 font-display text-[16px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[13px] text-muted">{text}</p>
        <a
          href={file.url}
          download={file.name}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface/80 px-4 text-sm font-medium text-ink transition-colors hover:border-accent/30 hover:bg-elevated"
        >
          <Download className="h-4 w-4" /> Yuklab olish
        </a>
      </div>
    </div>
  );
}

/** Word/PowerPoint — server PDF nusxani tayyorlaguncha kutamiz, keyin ko'rsatamiz. */
function OfficePreview({ file }: { file: Attachment }) {
  const name = file.url!.split("/").pop()!.split("?")[0];
  const previewUrl = `/uploads/preview/${name}`;
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "failed">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    // HEAD — server kerak bo'lsa aylantiradi va tayyor bo'lganda javob beradi
    fetch(previewUrl, { method: "HEAD" })
      .then((r) => {
        if (!alive) return;
        setState(r.ok ? "ready" : r.status === 501 ? "unavailable" : "failed");
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, [previewUrl]);

  if (state === "loading") return <Spinner text="Hujjat ko'rish uchun tayyorlanmoqda…" />;
  if (state === "ready") return <PdfFrame src={previewUrl} title={file.name} />;
  return (
    <Notice
      file={file}
      title="Hujjatni ko'rsatib bo'lmadi"
      text={
        state === "unavailable"
          ? "Serverda hujjatlarni ko'rish xizmati hali sozlanmagan. Administratorga xabar bering."
          : "Fayl buzilgan yoki bu formatni ochib bo'lmadi."
      }
    />
  );
}

type Sheet = { name: string; rows: string[][]; truncated: boolean };

function SheetPreview({ file }: { file: Attachment }) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSheets(null);
    setFailed(false);
    setActive(0);
    (async () => {
      try {
        const XLSX = await import("xlsx");
        const res = await fetch(file.url!);
        if (!res.ok) throw new Error(String(res.status));
        const wb =
          extOf(file) === "csv"
            ? XLSX.read(await res.text(), { type: "string" })
            : XLSX.read(await res.arrayBuffer(), { type: "array" });
        const out = wb.SheetNames.map((n) => {
          const all = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[n], {
            header: 1,
            raw: false,
            defval: "",
            blankrows: false,
          });
          return { name: n, rows: all.slice(0, MAX_ROWS), truncated: all.length > MAX_ROWS };
        });
        if (alive) setSheets(out);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [file]);

  if (failed)
    return <Notice file={file} title="Jadvalni ochib bo'lmadi" text="Fayl buzilgan yoki formati noto'g'ri." />;
  if (!sheets) return <Spinner text="Jadval yuklanmoqda…" />;

  const sheet = sheets[active];
  const cols = Math.max(0, ...(sheet?.rows.map((r) => r.length) ?? [0]));

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        {sheet && sheet.rows.length > 0 ? (
          <table className="nums min-w-full border-collapse text-[13px]">
            <tbody>
              {sheet.rows.map((r, i) => (
                <tr key={i} className={i === 0 ? "sticky top-0 z-[1] bg-elevated font-semibold text-ink" : "text-muted"}>
                  <td className="border border-border bg-elevated px-2 py-1 text-right text-[11px] text-faint">
                    {i + 1}
                  </td>
                  {Array.from({ length: cols }, (_, c) => (
                    <td key={c} className="whitespace-pre border border-border px-2 py-1">
                      {r[c] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-6 text-center text-[13px] text-muted">Varaq bo&apos;sh</p>
        )}
        {sheet?.truncated && (
          <p className="p-3 text-center text-[12px] text-faint">
            Faqat birinchi {MAX_ROWS} qator ko&apos;rsatilmoqda
          </p>
        )}
      </div>
      {sheets.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-t border-border p-1.5">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                i === active ? "bg-accent-soft text-accent" : "text-muted hover:bg-elevated hover:text-ink"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setText(null);
    setFailed(false);
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => alive && setText(t))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [url]);

  if (failed) return <p className="p-6 text-center text-[13px] text-muted">Faylni ochib bo&apos;lmadi</p>;
  if (text === null) return <Spinner text="Yuklanmoqda…" />;
  return (
    <pre className="h-full overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed text-ink sm:p-6">
      {text}
    </pre>
  );
}
