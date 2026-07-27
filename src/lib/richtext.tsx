import React from "react";
import { looksLikeHtml, sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

/**
 * Lightweight, dependency-free renderer for the small markdown subset we let
 * teachers/students write in posts and comments. The body is still stored as
 * plain text (backward compatible) — this only affects how it is displayed.
 *
 * Supported:
 *  - **bold**            → <strong>
 *  - __underline__       → <u>
 *  - *italic*            → <em>
 *  - `code`              → <code>
 *  - https://… links     → <a> (auto-linked, new tab)
 *  - lines starting with "- " or "• " → bullet list
 *  - blank line          → paragraph break
 */

const INLINE =
  /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|`[^`\n]+`|https?:\/\/[^\s]+)/g;

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  let i = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) {
      out.push(
        <strong key={key} className="font-semibold text-ink">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("__")) {
      out.push(
        <u key={key} className="underline decoration-from-font underline-offset-2">
          {tok.slice(2, -2)}
        </u>
      );
    } else if (tok.startsWith("`")) {
      out.push(
        <code
          key={key}
          className="rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[0.85em] text-ink"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("*")) {
      out.push(
        <em key={key} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    } else {
      out.push(
        <a
          key={key}
          href={tok}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
        >
          {tok}
        </a>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Render a plain-text body with the supported markdown subset. */
export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text?.trim()) return null;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${key++}`} className="my-1 ml-1 space-y-1">
        {items.map((b, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
            <span>{renderInline(b, `li-${idx}`)}</span>
          </li>
        ))}
      </ul>
    );
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();
    if (!line.trim()) {
      blocks.push(<div key={`sp-${key++}`} className="h-2" />);
      continue;
    }
    blocks.push(
      <p key={`p-${key++}`} className="leading-relaxed">
        {renderInline(line, `p-${key}`)}
      </p>
    );
  }
  flushBullets();

  return <div className={className}>{blocks}</div>;
}

/**
 * Render a post/lesson body. New posts are stored as sanitized WYSIWYG HTML;
 * older posts are plain text / markdown-lite — this transparently renders both.
 */
export function RichContent({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text?.trim()) return null;
  if (looksLikeHtml(text)) {
    return (
      <div
        className={cn("rich-body", className)}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
      />
    );
  }
  return <RichText text={text} className={className} />;
}
