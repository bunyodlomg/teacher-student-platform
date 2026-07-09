import type { IncomingMessage, ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, extname } from "node:path";

/**
 * Yuklangan fayllarni (public/uploads) to'g'ridan-to'g'ri diskdan uzatadi.
 *
 * NEGA: `next start` (production) `public/` papkasini server ishga tushgan
 * paytdagi holat bo'yicha xizmat qiladi — build'dan keyin runtime'da qo'shilgan
 * fayllar (foydalanuvchi yuklagan rasm/hujjat) uchun 404 qaytaradi. Shuning
 * uchun custom server (server.ts) `/uploads/*` so'rovlarini Next'ga bermay,
 * shu funksiya orqali diskdan o'qib beradi. Range so'rovlar (video/audio
 * seek) ham qo'llab-quvvatlanadi.
 */

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");
// UUID + kengaytma, papka o'tish (../) yo'q — bitta segment, xavfsiz belgilar.
const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".wav": "audio/wav",
  ".weba": "audio/webm",
  ".opus": "audio/opus",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".rtf": "application/rtf",
  ".zip": "application/zip",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".key": "application/octet-stream",
  ".odp": "application/vnd.oasis.opendocument.presentation",
};

const CACHE = "public, max-age=31536000, immutable";

function notFound(res: ServerResponse) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Topilmadi");
}

/** `/uploads/*` GET/HEAD so'rovini diskdan xizmat qiladi. */
export async function serveUpload(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }

  const pathname = decodeURIComponent((req.url || "").split("?")[0]);
  const name = pathname.slice("/uploads/".length);
  if (!SAFE_NAME.test(name)) return notFound(res);

  const filePath = join(UPLOADS_DIR, name);
  let size: number;
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return notFound(res);
    size = s.size;
  } catch {
    return notFound(res);
  }

  const type = MIME[extname(name).toLowerCase()] || "application/octet-stream";

  // Range (video/audio seek yoki qisman yuklash)
  const range = req.headers.range;
  const m = range ? /^bytes=(\d*)-(\d*)/.exec(range) : null;
  if (m) {
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? parseInt(m[2], 10) : size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": CACHE,
    });
    if (req.method === "HEAD") return void res.end();
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": size,
    "Accept-Ranges": "bytes",
    "Cache-Control": CACHE,
  });
  if (req.method === "HEAD") return void res.end();
  createReadStream(filePath).pipe(res);
}
