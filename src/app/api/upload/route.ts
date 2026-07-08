import { withAuth, requireUser, json, err } from "@/server/api";
import { AttachmentKind } from "@/lib/types";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

// Allowlist — only known-safe media/document types. Anything that can run in
// the browser origin (html, svg, js, exe, …) is rejected to avoid stored XSS /
// malware being served from /uploads.
const ALLOWED_EXT = new Set([
  // images
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "heic",
  // video
  "mp4", "webm", "mov", "m4v", "avi", "mkv",
  // audio
  "mp3", "m4a", "aac", "ogg", "oga", "wav", "weba", "opus",
  // documents
  "pdf", "doc", "docx", "ppt", "pptx", "key", "odp",
  "xls", "xlsx", "csv", "txt", "rtf", "zip",
]);

function kindFor(type: string, name: string): AttachmentKind {
  const n = name.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (/\.(ppt|pptx|key|odp)$/.test(n) || type.includes("presentation"))
    return "slides";
  return "doc";
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Upload a single file → saved under public/uploads, returns an Attachment. */
export const POST = withAuth(async (req: Request) => {
  // any authenticated user may upload (teachers: materials, students: work)
  await requireUser();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err("Noto'g'ri so'rov");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return err("Fayl topilmadi");
  if (file.size === 0) return err("Fayl bo'sh");
  if (file.size > MAX_BYTES) return err("Fayl 100 MB dan katta bo'lmasligi kerak");

  const ext = (file.name.split(".").pop() || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  if (!ext || !ALLOWED_EXT.has(ext)) {
    return err("Bu fayl turi qo'llab-quvvatlanmaydi");
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const fname = `${randomUUID()}.${ext}`;

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fname), buf);

  return json({
    attachment: {
      id: randomUUID(),
      kind: kindFor(file.type, file.name),
      name: file.name,
      meta: humanSize(file.size),
      url: `/uploads/${fname}`,
    },
  });
});
