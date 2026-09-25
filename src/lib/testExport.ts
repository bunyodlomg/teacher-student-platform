import type { Test, TestAttempt, User } from "@/lib/types";
import { gradeSortKey, NO_GRADE_LABEL, normalizeGrade } from "@/lib/grade";
import { formatDateTime } from "@/lib/utils";

/** Eksport uchun bitta qator — natijalar jadvalidagi qatorga mos. */
export interface ExportRow {
  attempt: TestAttempt;
  name: string;
  /** ishtirokchi kiritgan sinf (mehmon) — bo'sh bo'lishi mumkin */
  grade: string;
  phone: string;
  isGuest: boolean;
  /** 0..100 */
  pct: number;
}

/** Bitta testning eksportga tayyor to'plami. */
export interface TestExportBundle {
  test: Test;
  groupName?: string;
  rows: ExportRow[];
}

/** Excel varaq nomi: taqiqlangan belgilarsiz, 31 belgidan uzun emas, noyob. */
function sheetName(label: string, used: Set<string>): string {
  const base =
    label.replace(/[\\/?*[\]:]/g, "-").trim().slice(0, 31) || "Varaq";
  let name = base;
  let i = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${i++})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}

/** Boshlanish → topshirish oralig'i "12:34" ko'rinishida. */
export function durationLabel(from?: string, to?: string): string {
  if (!from || !to) return "—";
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function statusLabel(a: TestAttempt): string {
  if (a.status === "in_progress") return "Ishlamoqda";
  if (a.status === "auto_submitted") return "Vaqt tugadi";
  return "Topshirilgan";
}

/** Fayl nomi uchun xavfsiz matn. */
function safeFileName(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** Attemptlardan eksport qatorlarini yasaydi (ism — mehmon yoki foydalanuvchi). */
export function buildExportRows(
  attempts: TestAttempt[],
  users: User[]
): ExportRow[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  return attempts
    .map((a) => ({
      attempt: a,
      name: a.guest?.name ?? byId.get(a.studentId)?.name ?? "—",
      grade: a.guest?.grade ?? "",
      phone: a.guest?.phone ?? "",
      isGuest: !!a.isGuest,
      pct: a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0,
    }))
    .sort((x, y) => y.attempt.score - x.attempt.score);
}

const CLASS_HEAD = [
  "№",
  "Ism-familiya",
  "Telefon",
  "Turi",
  "Sana",
  "To'g'ri",
  "Jami",
  "Ball",
  "Maks",
  "Foiz",
  "Vaqt",
  "Qoida buzish",
  "Holat",
];
const CLASS_COLS = [4, 26, 16, 10, 18, 7, 6, 6, 6, 8, 8, 12, 14];

const GRADED_HEAD = ["№", "Ism-familiya", "Sinf", ...CLASS_HEAD.slice(2)];
const GRADED_COLS = [4, 26, 12, ...CLASS_COLS.slice(2)];

const FOIZ_IN_CLASS = CLASS_HEAD.indexOf("Foiz");
const FOIZ_IN_GRADED = GRADED_HEAD.indexOf("Foiz");

type Cell = string | number;

function classRow(r: ExportRow, i: number): Cell[] {
  return [
    i + 1,
    r.name,
    r.phone || "—",
    r.isGuest ? "Mehmon" : "O'quvchi",
    r.attempt.submittedAt ? formatDateTime(r.attempt.submittedAt) : "—",
    r.attempt.correctCount,
    r.attempt.totalCount,
    r.attempt.score,
    r.attempt.maxScore,
    r.pct / 100,
    durationLabel(r.attempt.startedAt, r.attempt.submittedAt),
    r.attempt.violations,
    statusLabel(r.attempt),
  ];
}

function gradedRow(r: ExportRow, grade: string, i: number): Cell[] {
  const [, name, ...rest] = classRow(r, i);
  return [i + 1, name, grade, ...rest];
}

export interface GradeBucket {
  label: string;
  rows: ExportRow[];
}

/** Qatorlarni sinf bo'yicha guruhlaydi (mehmon sinfi yo'q bo'lsa — guruh nomi). */
export function groupRowsByGrade(
  rows: ExportRow[],
  fallbackLabel?: string
): GradeBucket[] {
  const map = new Map<string, ExportRow[]>();
  // Guruh nomi sinfga o'xshasa ("8-A Ingliz tili") — mehmonlar yozgan "8a" bilan
  // bitta varaqqa tushishi uchun uni ham normallashtiramiz.
  const fallback = fallbackLabel
    ? normalizeGrade(fallbackLabel).match(/^\d/)
      ? normalizeGrade(fallbackLabel)
      : fallbackLabel
    : "";
  for (const r of rows) {
    const label =
      normalizeGrade(r.grade) ||
      (!r.isGuest && fallback ? fallback : NO_GRADE_LABEL);
    const list = map.get(label);
    if (list) list.push(r);
    else map.set(label, [r]);
  }
  return Array.from(map.entries())
    .map(([label, list]) => ({
      label,
      rows: [...list].sort((a, b) => b.attempt.score - a.attempt.score),
    }))
    .sort((a, b) => {
      const ka = gradeSortKey(a.label);
      const kb = gradeSortKey(b.label);
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]);
    });
}

function stats(rows: ExportRow[]) {
  const done = rows.filter((r) => r.attempt.status !== "in_progress");
  const pcts = done.map((r) => r.pct);
  return {
    total: rows.length,
    done: done.length,
    avg: pcts.length
      ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length)
      : null,
    best: pcts.length ? Math.max(...pcts) : null,
    worst: pcts.length ? Math.min(...pcts) : null,
    passed: pcts.filter((p) => p >= 60).length,
  };
}

const pctOrDash = (v: number | null): Cell => (v === null ? "—" : v / 100);

type XLSXNS = typeof import("xlsx");
type Sheet = ReturnType<XLSXNS["utils"]["aoa_to_sheet"]>;

/** Ustundagi foiz kataklarini "0%" formatiga o'tkazadi. */
function markPercent(
  XLSX: XLSXNS,
  ws: Sheet,
  rowsIdx: number[],
  cols: number[]
) {
  for (const r of rowsIdx) {
    for (const c of cols) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") cell.z = "0%";
    }
  }
}

const SUM_HEAD = [
  "Sinf",
  "Ishtirokchi",
  "Yakunlagan",
  "O'rtacha",
  "Eng yuqori",
  "Eng past",
  "60% dan yuqori",
];

function statRow(label: string, rows: ExportRow[]): Cell[] {
  const s = stats(rows);
  return [
    label,
    s.total,
    s.done,
    pctOrDash(s.avg),
    pctOrDash(s.best),
    pctOrDash(s.worst),
    s.passed,
  ];
}

function testSubtitle(b: TestExportBundle): string {
  return [
    b.test.subject || "Test",
    b.groupName,
    `${b.test.questionCount} savol`,
    `${b.test.durationMin} daqiqa`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Bitta test natijalari → Excel.
 * "Umumiy" + "Sinflar kesimi" varaqlari va HAR BIR SINF uchun alohida varaq.
 */
export async function downloadTestResults(
  bundle: TestExportBundle
): Promise<void> {
  const { test, groupName, rows } = bundle;
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  const buckets = groupRowsByGrade(rows, groupName);

  // 1. Umumiy — barcha ishtirokchilar bitta jadvalda
  const flat = buckets
    .flatMap((b) => b.rows.map((r) => ({ grade: b.label, r })))
    .sort((x, y) => y.r.attempt.score - x.r.attempt.score);
  const allBody = flat.map(({ grade, r }, i) => gradedRow(r, grade, i));
  const wsAll = XLSX.utils.aoa_to_sheet([
    [test.title],
    [testSubtitle(bundle)],
    [],
    GRADED_HEAD,
    ...allBody,
  ]);
  wsAll["!cols"] = GRADED_COLS.map((wch) => ({ wch }));
  markPercent(
    XLSX,
    wsAll,
    allBody.map((_, i) => 4 + i),
    [FOIZ_IN_GRADED]
  );
  XLSX.utils.book_append_sheet(wb, wsAll, sheetName("Umumiy", used));

  // 2. Sinflar kesimi — qisqa statistika
  const sumBody = buckets.map((b) => statRow(b.label, b.rows));
  const wsSum = XLSX.utils.aoa_to_sheet([
    [`${test.title} — sinflar kesimi`],
    [testSubtitle(bundle)],
    [],
    SUM_HEAD,
    ...sumBody,
    [],
    statRow("JAMI", rows),
  ]);
  wsSum["!cols"] = [22, 12, 12, 10, 12, 10, 16].map((wch) => ({ wch }));
  markPercent(
    XLSX,
    wsSum,
    [...sumBody.map((_, i) => 4 + i), 5 + sumBody.length],
    [3, 4, 5]
  );
  XLSX.utils.book_append_sheet(wb, wsSum, sheetName("Sinflar kesimi", used));

  // 3. Har bir sinf — alohida varaq
  for (const b of buckets) {
    const s = stats(b.rows);
    const body = b.rows.map((r, i) => classRow(r, i));
    const ws = XLSX.utils.aoa_to_sheet([
      [`${b.label} — ${test.title}`],
      [
        `${test.subject || "Test"} · ${b.rows.length} ishtirokchi · o'rtacha ${
          s.avg === null ? "—" : `${s.avg}%`
        }`,
      ],
      [],
      CLASS_HEAD,
      ...body,
    ]);
    ws["!cols"] = CLASS_COLS.map((wch) => ({ wch }));
    markPercent(
      XLSX,
      ws,
      body.map((_, i) => 4 + i),
      [FOIZ_IN_CLASS]
    );
    XLSX.utils.book_append_sheet(wb, ws, sheetName(b.label, used));
  }

  XLSX.writeFile(wb, `${safeFileName(test.title) || "test"} - natijalar.xlsx`);
}

/**
 * Bir nechta test natijalari → bitta Excel.
 * "Barcha natijalar" + "Testlar kesimi" varaqlari, so'ng har bir test uchun
 * varaq: ichida har sinf alohida jadval bo'lib joylashadi.
 */
export async function downloadAllTestResults(
  bundles: TestExportBundle[],
  fileName = "Barcha testlar - natijalar.xlsx"
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();

  const prepared = bundles.map((b) => ({
    bundle: b,
    buckets: groupRowsByGrade(b.rows, b.groupName),
  }));

  // 1. Barcha natijalar — test + sinf ustunlari bilan yagona jadval
  const ALL_HEAD = ["№", "Test", "Fan", "Guruh", "Sinf", ...CLASS_HEAD.slice(1)];
  const ALL_COLS = [4, 28, 16, 18, 12, ...CLASS_COLS.slice(1)];
  const foizInAll = ALL_HEAD.indexOf("Foiz");
  const allBody: Cell[][] = [];
  for (const { bundle, buckets } of prepared) {
    for (const b of buckets) {
      for (const r of b.rows) {
        const [, ...rest] = classRow(r, 0);
        allBody.push([
          allBody.length + 1,
          bundle.test.title,
          bundle.test.subject || "—",
          bundle.groupName ?? "—",
          b.label,
          ...rest,
        ]);
      }
    }
  }
  const wsAll = XLSX.utils.aoa_to_sheet([ALL_HEAD, ...allBody]);
  wsAll["!cols"] = ALL_COLS.map((wch) => ({ wch }));
  markPercent(
    XLSX,
    wsAll,
    allBody.map((_, i) => 1 + i),
    [foizInAll]
  );
  XLSX.utils.book_append_sheet(wb, wsAll, sheetName("Barcha natijalar", used));

  // 2. Testlar kesimi — test × sinf statistikasi
  const OVER_HEAD = ["Test", "Fan", "Guruh", ...SUM_HEAD];
  const overBody: Cell[][] = [];
  for (const { bundle, buckets } of prepared) {
    overBody.push([
      bundle.test.title,
      bundle.test.subject || "—",
      bundle.groupName ?? "—",
      ...statRow("— barchasi —", bundle.rows),
    ]);
    for (const b of buckets) {
      overBody.push(["", "", "", ...statRow(b.label, b.rows)]);
    }
  }
  const wsOver = XLSX.utils.aoa_to_sheet([OVER_HEAD, ...overBody]);
  wsOver["!cols"] = [28, 16, 18, 22, 12, 12, 10, 12, 10, 16].map((wch) => ({
    wch,
  }));
  markPercent(
    XLSX,
    wsOver,
    overBody.map((_, i) => 1 + i),
    [6, 7, 8]
  );
  XLSX.utils.book_append_sheet(wb, wsOver, sheetName("Testlar kesimi", used));

  // 3. Har bir test — varaq ichida sinflar alohida jadval
  for (const { bundle, buckets } of prepared) {
    const aoa: Cell[][] = [[bundle.test.title], [testSubtitle(bundle)], []];
    const pctRows: number[] = [];
    for (const b of buckets) {
      const s = stats(b.rows);
      aoa.push([
        `${b.label} · ${b.rows.length} ishtirokchi · o'rtacha ${
          s.avg === null ? "—" : `${s.avg}%`
        }`,
      ]);
      aoa.push(CLASS_HEAD);
      b.rows.forEach((r, i) => {
        pctRows.push(aoa.length);
        aoa.push(classRow(r, i));
      });
      aoa.push([]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = CLASS_COLS.map((wch) => ({ wch }));
    markPercent(XLSX, ws, pctRows, [FOIZ_IN_CLASS]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName(bundle.test.title, used));
  }

  XLSX.writeFile(wb, fileName);
}
