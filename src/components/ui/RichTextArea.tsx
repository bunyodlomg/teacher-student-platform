"use client";

import { escapeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bold,
  Code,
  Eraser,
  Heading,
  Italic,
  List,
  ListOrdered,
  Quote,
  Smile,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const EMOJIS = [
  "😀", "😅", "😂", "😍", "🤩", "😎", "🤔", "👍", "👏", "🙌",
  "🔥", "💡", "✨", "🎯", "✅", "❤️", "🎉", "📚", "✍️", "⭐",
];

const isMac =
  typeof navigator !== "undefined" && /Mac|iP(hone|ad)/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

/**
 * A true WYSIWYG rich-text editor (Word / Google Docs style) built on
 * `contentEditable`. Bold / italic / underline etc. render live — no markdown
 * symbols. Keyboard shortcuts (⌘/Ctrl+B, I, U, ⇧8, ⇧7) work natively, paste is
 * cleaned to plain text, and ⌘/Ctrl+Enter submits. Emits sanitized-on-render
 * HTML via `value` / `onChange`.
 */
export function RichTextArea({
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
  minHeight = 160,
  maxLength,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef<string>(value);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [empty, setEmpty] = useState(!value?.trim());
  const [count, setCount] = useState(0);
  const [active, setActive] = useState<Record<string, boolean>>({});

  // one-time init: disable inline styles so bold → <b> (not <span style>)
  useEffect(() => {
    try {
      document.execCommand("styleWithCSS", false, String(false));
    } catch {
      /* ignore */
    }
    const el = ref.current;
    if (el) {
      el.innerHTML = value || "";
      lastHtml.current = value;
      const text = el.textContent ?? "";
      setEmpty(!text.trim());
      setCount(text.length);
      if (autoFocus) el.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync external value changes (reset, draft hydrate, editing another post)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== lastHtml.current) {
      el.innerHTML = value || "";
      lastHtml.current = value;
      const text = el.textContent ?? "";
      setEmpty(!text.trim());
      setCount(text.length);
    }
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const text = el.textContent ?? "";
    // normalise a visually-empty editor (stray <br>/<div>) to ""
    const html = text.trim() ? el.innerHTML : "";
    lastHtml.current = html;
    setEmpty(!text.trim());
    setCount(text.length);
    onChange(html);
  };

  const refreshActive = () => {
    const q = (c: string) => {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    setActive({
      bold: q("bold"),
      italic: q("italic"),
      underline: q("underline"),
      strike: q("strikeThrough"),
      ul: q("insertUnorderedList"),
      ol: q("insertOrderedList"),
    });
  };

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
    refreshActive();
  };

  const formatBlock = (tag: string) => {
    ref.current?.focus();
    // toggle: if the selection is already this block, revert to paragraph
    const isActive = document
      .queryCommandValue("formatBlock")
      ?.toLowerCase()
      .includes(tag);
    document.execCommand("formatBlock", false, `<${isActive ? "p" : tag}>`);
    emit();
  };

  const insertCode = () => {
    ref.current?.focus();
    const text = window.getSelection()?.toString();
    document.execCommand(
      "insertHTML",
      false,
      `<code>${text ? escapeHtml(text) : "kod"}</code>&nbsp;`
    );
    emit();
  };

  const insertEmoji = (e: string) => {
    ref.current?.focus();
    document.execCommand("insertText", false, e);
    setEmojiOpen(false);
    emit();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (onSubmit && mod && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
      return;
    }
    if (mod && e.shiftKey) {
      if (e.key === "8" || e.key === "*") {
        e.preventDefault();
        exec("insertUnorderedList");
      } else if (e.key === "7" || e.key === "&") {
        e.preventDefault();
        exec("insertOrderedList");
      }
    }
    // ⌘/Ctrl+B, I, U are handled natively by contentEditable
  };

  const onBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!maxLength) return;
    const native = e.nativeEvent as InputEvent;
    const inserting = native.inputType?.startsWith("insert");
    const len = ref.current?.textContent?.length ?? 0;
    if (inserting && len >= maxLength) e.preventDefault();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  };

  const tools = [
    { icon: Bold, label: "Qalin", key: `${MOD}+B`, on: active.bold, run: () => exec("bold") },
    { icon: Italic, label: "Kursiv", key: `${MOD}+I`, on: active.italic, run: () => exec("italic") },
    { icon: Underline, label: "Tagchi", key: `${MOD}+U`, on: active.underline, run: () => exec("underline") },
    { icon: Strikethrough, label: "Chizilgan", on: active.strike, run: () => exec("strikeThrough") },
    { sep: true as const },
    { icon: Heading, label: "Sarlavha", run: () => formatBlock("h3") },
    { icon: List, label: "Ro'yxat", key: `${MOD}+⇧8`, on: active.ul, run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Raqamli", key: `${MOD}+⇧7`, on: active.ol, run: () => exec("insertOrderedList") },
    { icon: Quote, label: "Iqtibos", run: () => formatBlock("blockquote") },
    { icon: Code, label: "Kod", run: insertCode },
    { icon: Eraser, label: "Formatni tozalash", run: () => exec("removeFormat") },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-bg/50 transition-colors focus-within:border-accent/50 focus-within:bg-surface focus-within:ring-4 focus-within:ring-accent/10",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 px-1.5 py-1">
        {tools.map((t, i) =>
          "sep" in t ? (
            <span key={`sep-${i}`} className="mx-1 h-5 w-px bg-border/70" />
          ) : (
            <button
              key={t.label}
              type="button"
              title={t.key ? `${t.label}  ·  ${t.key}` : t.label}
              aria-label={t.label}
              aria-pressed={t.on ?? false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={t.run}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-lg transition-colors hover:bg-elevated hover:text-ink",
                t.on ? "bg-accent-soft text-accent" : "text-muted"
              )}
            >
              <t.icon className="h-4 w-4" />
            </button>
          )
        )}

        <div className="relative">
          <button
            type="button"
            title="Emoji"
            aria-label="Emoji"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setEmojiOpen((v) => !v)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-lg transition-colors hover:bg-elevated hover:text-ink",
              emojiOpen ? "bg-elevated text-ink" : "text-muted"
            )}
          >
            <Smile className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {emojiOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setEmojiOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-9 z-20 grid w-[15rem] grid-cols-10 gap-0.5 rounded-xl border border-border bg-surface p-1.5 shadow-lift"
                >
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => insertEmoji(e)}
                      className="grid h-6 place-items-center rounded-md text-base transition-transform hover:scale-125 hover:bg-elevated"
                    >
                      {e}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {maxLength && (
          <span
            className={cn(
              "ml-auto pr-1 text-[11px] tabular-nums",
              count > maxLength * 0.9 ? "text-warning" : "text-faint"
            )}
          >
            {count}/{maxLength}
          </span>
        )}
      </div>

      <div className="relative">
        {empty && (
          <div className="pointer-events-none absolute left-0 top-0 px-3.5 py-2.5 text-sm text-faint">
            {placeholder}
          </div>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={emit}
          onKeyDown={onKeyDown}
          onBeforeInput={onBeforeInput}
          onPaste={onPaste}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onFocus={refreshActive}
          style={{ minHeight }}
          className="rich-body block w-full px-3.5 py-2.5 text-sm leading-relaxed text-ink focus:outline-none"
        />
      </div>
    </div>
  );
}
