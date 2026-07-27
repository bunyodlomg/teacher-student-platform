/**
 * Dependency-free, isomorphic HTML sanitizer for the WYSIWYG post editor.
 * Teachers author rich text (bold / lists / headings …) which is stored as
 * HTML; this whitelist strips anything unsafe before it is rendered with
 * `dangerouslySetInnerHTML`. Works on both server (SSR) and client.
 */

// tag → allowed attribute names
const ALLOWED: Record<string, string[]> = {
  p: [],
  br: [],
  div: [],
  span: [],
  b: [],
  strong: [],
  i: [],
  em: [],
  u: [],
  s: [],
  strike: [],
  code: [],
  pre: [],
  blockquote: [],
  h1: [],
  h2: [],
  h3: [],
  ul: [],
  ol: [],
  li: [],
  a: ["href"],
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Whitelist-sanitize an HTML string. Unknown tags are dropped (their text is
 * kept); all attributes except a validated `href` on `<a>` are removed. */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  let html = dirty
    // drop dangerous elements together with their content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  html = html.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_m, close: string, name: string, attrs: string) => {
      const tag = name.toLowerCase();
      if (!(tag in ALLOWED)) return ""; // drop tag, keep inner text
      if (close) return `</${tag}>`;

      let out = `<${tag}`;
      if (ALLOWED[tag].includes("href")) {
        const hrefMatch = attrs.match(
          /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i
        );
        const href = (
          hrefMatch?.[2] ??
          hrefMatch?.[3] ??
          hrefMatch?.[4] ??
          ""
        ).trim();
        if (/^(https?:|mailto:)/i.test(href)) {
          out += ` href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"`;
        }
      }
      return out + ">";
    }
  );

  return html;
}

/** True when a string appears to contain HTML markup. */
export function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

/** Flatten HTML to readable plain text (for search + previews). */
export function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Convert the legacy plain-text / markdown-lite body into HTML so old posts can
 * be edited in the WYSIWYG editor. Output is re-sanitized on render.
 */
export function textToHtml(text: string): string {
  if (!text?.trim()) return "";

  const inline = (line: string) =>
    escapeHtml(line)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<u>$1</u>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1">$1</a>'
      );

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;
    out.push(`<ul>${bullets.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`);
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^[-•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (line) out.push(`<p>${inline(line)}</p>`);
  }
  flush();

  return out.join("");
}
