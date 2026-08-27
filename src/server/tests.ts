import type { TestDoc } from "./models";
import type { TestAttemptDoc } from "./models";
import type { ExamQuestion } from "@/lib/types";

/** Qisqa javoblarni solishtirish uchun normallashtirish. */
export function normText(s: string | undefined | null): string {
  return (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"'`]+$/g, "");
}

/** Fisher–Yates — massivning aralashtirilgan nusxasini qaytaradi. */
export function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface RawQuestion {
  _id: unknown;
  type: string;
  options?: { _id: unknown }[];
  correctOptionId?: string;
  correctText?: string;
  points?: number;
}
interface RawAnswer {
  questionId: string;
  optionId?: string;
  text?: string;
  correct?: boolean;
}

const oid = (v: unknown): string =>
  v == null ? "" : typeof v === "string" ? v : (v as { toString(): string }).toString();

/**
 * Urinishni test javoblariga qarab baholaydi. Attempt.answers ichidagi `correct`
 * bayrog'ini to'ldiradi va {score, maxScore, correctCount, totalCount} qaytaradi.
 */
export function gradeAttempt(
  test: TestDoc,
  attempt: TestAttemptDoc
): { score: number; maxScore: number; correctCount: number; totalCount: number } {
  const questions = (test.questions ?? []) as unknown as RawQuestion[];
  const answers = (attempt.answers ?? []) as unknown as RawAnswer[];
  const byQ = new Map<string, RawAnswer>();
  for (const a of answers) byQ.set(a.questionId, a);

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;

  for (const q of questions) {
    const pts = q.points ?? 1;
    maxScore += pts;
    const ans = byQ.get(oid(q._id));
    let correct = false;
    if (ans) {
      if (q.type === "short") {
        correct =
          !!q.correctText && normText(ans.text) === normText(q.correctText) &&
          normText(ans.text) !== "";
      } else {
        correct = !!ans.optionId && ans.optionId === q.correctOptionId;
      }
      ans.correct = correct;
    }
    if (correct) {
      score += pts;
      correctCount += 1;
    }
  }

  return { score, maxScore, correctCount, totalCount: questions.length };
}

interface RawOptFull {
  _id: unknown;
  text: string;
}
interface RawQFull {
  _id: unknown;
  type: string;
  text: string;
  imageUrl?: string;
  options?: RawOptFull[];
  points?: number;
}

/** Saqlangan tartib (served) bo'yicha xavfsiz (javobsiz) savollarni quradi. */
export function buildExam(
  test: { questions?: RawQFull[] },
  served: { questionId: string; optionIds: string[] }[]
): ExamQuestion[] {
  const qById = new Map<string, RawQFull>();
  for (const q of (test.questions ?? []) as RawQFull[]) qById.set(oid(q._id), q);
  const out: ExamQuestion[] = [];
  for (const s of served) {
    const q = qById.get(s.questionId);
    if (!q) continue;
    const optById = new Map<string, RawOptFull>();
    for (const o of q.options ?? []) optById.set(oid(o._id), o);
    out.push({
      id: s.questionId,
      type: q.type as ExamQuestion["type"],
      text: q.text,
      imageUrl: q.imageUrl || undefined,
      points: q.points ?? 1,
      options: s.optionIds
        .map((id) => optById.get(id))
        .filter((o): o is RawOptFull => !!o)
        .map((o) => ({ id: oid(o._id), text: o.text })),
    });
  }
  return out;
}
