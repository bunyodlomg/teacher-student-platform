import type { IncomingMessage, ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Office hujjatlarini (Word, PowerPoint, …) brauzerda yuklab olmasdan ko'rish
 * uchun PDF'ga aylantiradi — LibreOffice (`soffice --headless`) orqali.
 *
 * NEGA: maktab kompyuterlarida har bir material yuklab olinsa disk to'lib
 * ketadi. PDF'ni brauzer o'zi ichida ko'rsatadi, faylni Downloads'ga saqlamaydi.
 *
 * Natija `public/uploads/previews/<uuid>.pdf` ga keshlanadi — har fayl bir
 * marta aylantiriladi. LibreOffice o'rnatilmagan bo'lsa 501 qaytadi va klient
 * "ko'rib bo'lmaydi" holatini ko'rsatadi.
 */

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");
const PREVIEW_DIR = join(UPLOADS_DIR, "previews");
const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

/** PDF'ga aylantirib ko'rsatiladigan kengaytmalar. */
export const CONVERTIBLE_EXT = new Set([
  "doc", "docx", "rtf", "odt", "ppt", "pptx", "odp", "key",
]);

const CONVERT_TIMEOUT_MS = 120_000;

let sofficePath: string | null | undefined;

/** LibreOffice binarini topadi (PATH yoki standart joylar). Natija keshlanadi. */
function findSoffice(): string | null {
  if (sofficePath !== undefined) return sofficePath;
  const candidates = [
    process.env.SOFFICE_PATH,
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/usr/local/bin/soffice",
    "/opt/libreoffice/program/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter(Boolean) as string[];
  sofficePath = candidates.find((p) => existsSync(p)) ?? null;
  return sofficePath;
}

// Kichik VPS'da bir vaqtda bitta soffice — RAM'ni tejaydi. Holat globalThis'da:
// server.ts (tsx) va Next bundle'i bu modulni alohida yuklaydi, navbat esa umumiy.
const g = globalThis as typeof globalThis & {
  __previewQueue?: { tail: Promise<unknown>; inflight: Map<string, Promise<boolean>> };
};
const state = (g.__previewQueue ??= { tail: Promise.resolve(), inflight: new Map() });

function runSoffice(bin: string, src: string, outDir: string, profile: string) {
  return new Promise<boolean>((resolve) => {
    const child = spawn(
      bin,
      [
        `-env:UserInstallation=${pathToFileURL(profile).href}`,
        "--headless",
        "--norestore",
        "--convert-to",
        "pdf",
        "--outdir",
        outDir,
        src,
      ],
      { stdio: "ignore", windowsHide: true }
    );
    const timer = setTimeout(() => child.kill("SIGKILL"), CONVERT_TIMEOUT_MS);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

async function convert(bin: string, name: string, out: string): Promise<boolean> {
  const work = await mkdtemp(join(tmpdir(), "cl-preview-"));
  try {
    const ok = await runSoffice(bin, join(UPLOADS_DIR, name), work, join(work, "profile"));
    const produced = join(work, `${basename(name, extname(name))}.pdf`);
    if (!ok || !existsSync(produced)) return false;
    await mkdir(PREVIEW_DIR, { recursive: true });
    // tmp boshqa diskda bo'lishi mumkin → rename yiqilsa nusxa orqali
    await rename(produced, out).catch(() => copyFile(produced, out));
    return true;
  } catch (e) {
    console.error("preview convert xatosi:", name, e);
    return false;
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

export type PreviewResult =
  | { ok: true; path: string }
  | { ok: false; status: 404 | 415 | 422 | 501 };

/** Ko'rish uchun PDF'ni tayyorlaydi (keshda bo'lsa darhol qaytaradi). */
export async function ensurePreview(name: string): Promise<PreviewResult> {
  if (!SAFE_NAME.test(name)) return { ok: false, status: 404 };
  const ext = extname(name).slice(1).toLowerCase();
  if (!CONVERTIBLE_EXT.has(ext)) return { ok: false, status: 415 };

  const out = join(PREVIEW_DIR, `${basename(name, extname(name))}.pdf`);
  if (existsSync(out)) return { ok: true, path: out };
  if (!existsSync(join(UPLOADS_DIR, name))) return { ok: false, status: 404 };

  const bin = findSoffice();
  if (!bin) return { ok: false, status: 501 };

  let job = state.inflight.get(name);
  if (!job) {
    job = state.tail.then(() => convert(bin, name, out));
    state.tail = job.catch(() => {});
    state.inflight.set(name, job);
    void job.finally(() => state.inflight.delete(name));
  }
  return (await job) ? { ok: true, path: out } : { ok: false, status: 422 };
}

/** Yuklash paytida fonda aylantirishni boshlaydi — o'quvchi ochganda tayyor bo'ladi. */
export function warmPreview(name: string) {
  const ext = extname(name).slice(1).toLowerCase();
  if (CONVERTIBLE_EXT.has(ext) && findSoffice()) void ensurePreview(name);
}

/** `GET|HEAD /uploads/preview/<uuid>.<ext>` → PDF ko'rinishi. */
export async function servePreview(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }
  let name = "";
  try {
    name = decodeURIComponent((req.url || "").split("?")[0]).slice(
      "/uploads/preview/".length
    );
  } catch {
    /* buzuq URL → SAFE_NAME tekshiruvi 404 beradi */
  }

  const r = await ensurePreview(name);
  if (!r.ok) {
    res.writeHead(r.status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(r.status === 501 ? "Ko'rish xizmati o'rnatilmagan" : "Ko'rib bo'lmadi");
    return;
  }

  const { size } = await stat(r.path);
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Length": size,
    // inline — brauzer faylni saqlamasdan o'z ichida ochadi
    "Content-Disposition": "inline",
    "Cache-Control": "private, max-age=86400",
  });
  if (req.method === "HEAD") return void res.end();
  createReadStream(r.path).pipe(res);
}
