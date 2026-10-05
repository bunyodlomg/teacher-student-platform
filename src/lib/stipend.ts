/**
 * Stipendiya reytingi — HAR SINFDAN bitta eng kuchli o'quvchi.
 *
 * Hisob qoidasi (maktab talabi):
 *  1. Ishtirokchi barcha testlar kesimida aniqlanadi — telefon yoki ism+sinf
 *     bo'yicha (`participantGroups`, qarang: `src/lib/dedupe.ts`).
 *  2. Bir fan bir necha marta topshirilgan bo'lsa — faqat ENG YUQORI foizi
 *     olinadi (teng bo'lsa tezroq ishlagani).
 *  3. Umumiy ball = eng kuchli 2 ta fan foizlari yig'indisi (maks 200).
 *     Misol: Ali 100% + 90% = 190 · Vali 100% + 91% = 191 → Vali ustun.
 *  4. Sinf g'olibi — shu sinfdagi eng yuqori umumiy ball.
 *
 * Tugallanmagan ("ishlamoqda") urinishlar hisobga olinmaydi.
 */

import { dominantGrade, participantGroups, spent } from "@/lib/dedupe";
import {
  fallbackGradeLabel,
  gradeLabelFor,
  gradeSortKey,
  NO_GRADE_LABEL,
} from "@/lib/grade";
import type { ExportRow, TestExportBundle } from "@/lib/testExport";
import type { TestAttempt } from "@/lib/types";

/** Reytingga nechta fan qo'shiladi. */
export const COUNTED_SUBJECTS = 2;

/** Bitta fan bo'yicha o'quvchining eng yaxshi natijasi. */
export interface SubjectScore {
  /** fan nomi — test "subject" maydoni, bo'sh bo'lsa test sarlavhasi */
  subject: string;
  /** 0..100 */
  pct: number;
  testTitle: string;
  attempt: TestAttempt;
  /** shu fan bo'yicha nechta urinish bo'lgan (1 dan katta bo'lsa — qayta topshirgan) */
  tries: number;
}

/** Reytingdagi bitta ishtirokchi. */
export interface StipendEntry {
  name: string;
  grade: string;
  phone: string;
  isGuest: boolean;
  /** barcha fanlar — eng yuqori foizdan pastga */
  subjects: SubjectScore[];
  /** umumiy ballga qo'shilgan fanlar (ko'pi bilan COUNTED_SUBJECTS ta) */
  counted: SubjectScore[];
  /** counted foizlari yig'indisi — maks 200 */
  total: number;
}

/** Bitta sinf bo'yicha reyting. */
export interface ClassStanding {
  grade: string;
  /** umumiy ball bo'yicha tartiblangan */
  entries: StipendEntry[];
  /** entries[0] — stipendiyaga nomzod */
  winner: StipendEntry;
}

/** Flatten qilingan bitta natija — qaysi test, qaysi fan, qaysi sinf. */
interface FlatRow {
  row: ExportRow;
  subject: string;
  subjectKey: string;
  testTitle: string;
  gradeLabel: string;
}

/** Fanlarni taqqoslash kaliti — katta-kichik harf va ortiqcha probellarsiz. */
function subjectKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Ishtirokchining sinfi — eng ko'p uchragan haqiqiy sinf nomi. */
function entryGrade(items: FlatRow[]): string {
  // mehmon o'zi yozgan sinf ustun (dominantGrade normalizatsiya qiladi)
  const typed = dominantGrade(items.map((f) => f.row));
  if (typed) return typed;
  // ro'yxatdagi o'quvchi — guruh nomidan kelgan sinf
  const count = new Map<string, number>();
  for (const f of items) {
    if (f.gradeLabel && f.gradeLabel !== NO_GRADE_LABEL)
      count.set(f.gradeLabel, (count.get(f.gradeLabel) ?? 0) + 1);
  }
  let best = NO_GRADE_LABEL;
  let n = 0;
  for (const [g, c] of count) {
    if (c > n) {
      best = g;
      n = c;
    }
  }
  return best;
}

/** Ishtirokchi sarflagan umumiy vaqt — teng ballarni ajratish uchun. */
function totalSpent(e: StipendEntry): number {
  return e.counted.reduce((s, c) => {
    const ms = spent(c.attempt);
    return s + (ms === Number.MAX_SAFE_INTEGER ? 0 : ms);
  }, 0);
}

/**
 * Barcha testlar natijalaridan sinf kesimidagi stipendiya reytingini yig'adi.
 * `bundles` ichida XOM qatorlar bo'lishi kerak (takrorlar olib tashlanmagan) —
 * qayta topshirishlar shu yerda fan bo'yicha birlashtiriladi.
 */
export function buildStipendStandings(
  bundles: TestExportBundle[]
): ClassStanding[] {
  // 1. Barcha yakunlangan natijalarni bitta ro'yxatga yig'amiz
  const flat: FlatRow[] = [];
  for (const b of bundles) {
    const fallback = fallbackGradeLabel(b.groupName);
    const subject = (b.test.subject || "").trim() || b.test.title;
    for (const row of b.rows) {
      if (row.attempt.status === "in_progress") continue;
      flat.push({
        row,
        subject,
        subjectKey: subjectKey(subject),
        testTitle: b.test.title,
        gradeLabel: gradeLabelFor(row, fallback),
      });
    }
  }
  if (flat.length === 0) return [];

  // 2. Ishtirokchilarga ajratamiz (telefon / ism+sinf)
  const entries: StipendEntry[] = [];
  for (const idx of participantGroups(flat.map((f) => f.row))) {
    const items = idx.map((i) => flat[i]);

    // 3. Har fandan eng yaxshi natija (teng foiz — tezroq ishlagani)
    const bySubject = new Map<string, FlatRow[]>();
    for (const f of items) {
      const list = bySubject.get(f.subjectKey);
      if (list) list.push(f);
      else bySubject.set(f.subjectKey, [f]);
    }
    const subjects: SubjectScore[] = Array.from(bySubject.values()).map(
      (list) => {
        const best = [...list].sort(
          (a, b) =>
            b.row.pct - a.row.pct || spent(a.row.attempt) - spent(b.row.attempt)
        )[0];
        return {
          subject: best.subject,
          pct: best.row.pct,
          testTitle: best.testTitle,
          attempt: best.row.attempt,
          tries: list.length,
        };
      }
    );
    subjects.sort(
      (a, b) => b.pct - a.pct || spent(a.attempt) - spent(b.attempt)
    );

    // 4. Eng kuchli 2 fan — umumiy ball
    const counted = subjects.slice(0, COUNTED_SUBJECTS);
    const withName = items.find((f) => f.row.name && f.row.name !== "—") ?? items[0];
    entries.push({
      name: withName.row.name,
      grade: entryGrade(items),
      phone: items.find((f) => f.row.phone)?.row.phone ?? "",
      isGuest: items.every((f) => f.row.isGuest),
      subjects,
      counted,
      total: counted.reduce((s, c) => s + c.pct, 0),
    });
  }

  // 5. Sinflarga bo'lib tartiblaymiz
  const byGrade = new Map<string, StipendEntry[]>();
  for (const e of entries) {
    const list = byGrade.get(e.grade);
    if (list) list.push(e);
    else byGrade.set(e.grade, [e]);
  }

  return Array.from(byGrade.entries())
    .map(([grade, list]) => {
      const sorted = [...list].sort(
        (a, b) =>
          b.total - a.total ||
          // teng ball: ko'proq fan ishlagani, so'ng tezroq ishlagani ustun
          b.counted.length - a.counted.length ||
          totalSpent(a) - totalSpent(b) ||
          a.name.localeCompare(b.name)
      );
      return { grade, entries: sorted, winner: sorted[0] };
    })
    .sort((a, b) => {
      const ka = gradeSortKey(a.grade);
      const kb = gradeSortKey(b.grade);
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]);
    });
}
