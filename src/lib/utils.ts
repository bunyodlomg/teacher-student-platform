import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Explicit Uzbek names — Intl's "uz-UZ" locale renders months as "M06" etc.,
// which is confusing, so we format dates ourselves.
const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const UZ_MONTHS_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];
const UZ_WEEKDAYS = [
  "Yakshanba", "Dushanba", "Seshanba", "Chorshanba",
  "Payshanba", "Juma", "Shanba",
];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Relative time like "2 soat oldin", "3 kundan keyin" */
export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const date = d.getTime();
  const now = Date.now();
  const diff = date - now;
  const abs = Math.abs(diff);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  const fmt = (n: number, unit: string) =>
    diff >= 0 ? `${n} ${unit}dan keyin` : `${n} ${unit} oldin`;

  if (abs < min) return "hozirgina";
  if (abs < hour) return fmt(Math.round(abs / min), "daqiqa");
  if (abs < day) return fmt(Math.round(abs / hour), "soat");
  if (abs < 7 * day) return fmt(Math.round(abs / day), "kun");
  return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]}`;
}

/** e.g. "30-Iyun, 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

/** e.g. "30-Iyun, Seshanba" */
export function formatDateLong(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${UZ_WEEKDAYS[d.getDay()]}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]}, ${d.getHours()}:${pad2(
    d.getMinutes()
  )}`;
}

/** Days until a due date (negative if overdue) */
export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function dueLabel(iso: string): { label: string; tone: "ok" | "soon" | "over" } {
  const d = daysUntil(iso);
  if (d < 0) return { label: `${Math.abs(d)} kun kechikdi`, tone: "over" };
  if (d === 0) return { label: "Bugun topshiriladi", tone: "soon" };
  if (d === 1) return { label: "Ertaga topshiriladi", tone: "soon" };
  if (d <= 3) return { label: `${d} kundan keyin`, tone: "soon" };
  return { label: `Muddati: ${formatDate(iso)}`, tone: "ok" };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** ISO string offset from now by given hours (can be negative) */
export function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

export function daysFromNow(d: number): string {
  return hoursFromNow(d * 24);
}
