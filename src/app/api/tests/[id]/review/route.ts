import { withAuth, requireUser, json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt } from "@/server/models";
import { normText } from "@/server/tests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const oid = (v: unknown): string =>
  v == null
    ? ""
    : typeof v === "string"
    ? v
    : (v as { toString(): string }).toString();

interface RawOption {
  _id: unknown;
  text: string;
}
interface RawQuestion {
  _id: unknown;
  type: "single" | "boolean" | "short";
  text: string;
  imageUrl?: string;
  options?: RawOption[];
  correctOptionId?: string;
  correctText?: string;
  points?: number;
}

/**
 * O'quvchining o'z urinishini savolma-savol ko'rib chiqishi.
 * - Qaysi savolda xato qilgani doim ko'rinadi.
 * - To'g'ri javoblar faqat test yopilgach oshkor qilinadi (boshqalar hali
 *   ishlayotgan bo'lsa javoblar sizib chiqmasligi uchun).
 */
export const GET = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    await connectDB();

    const test = await Test.findById(ctx.params.id).lean().exec();
    if (!test) return notFound();

    const attempt = await TestAttempt.findOne({
      testId: test._id,
      studentId: me._id,
    })
      .lean()
      .exec();
    if (!attempt) return notFound();
    if (attempt.status === "in_progress")
      return err("Test hali topshirilmagan");

    const reveal = test.status === "closed";
    const questions = (test.questions ?? []) as unknown as RawQuestion[];
    const qById = new Map<string, RawQuestion>();
    for (const q of questions) qById.set(oid(q._id), q);

    const answers = (attempt.answers ?? []) as unknown as {
      questionId: string;
      optionId?: string;
      text?: string;
      correct?: boolean;
    }[];
    const ansByQ = new Map(answers.map((a) => [a.questionId, a]));

    // o'quvchi ko'rgan tartib (aralashtirilgan) bo'lsa — o'shani ishlatamiz
    const served = (attempt.served ?? []) as unknown as {
      questionId: string;
      optionIds?: string[];
    }[];
    const order = served.length
      ? served.map((s) => s.questionId)
      : questions.map((q) => oid(q._id));
    const servedOpts = new Map(
      served.map((s) => [s.questionId, s.optionIds ?? []])
    );

    const review = order
      .map((qid, i) => {
        const q = qById.get(qid);
        if (!q) return null;
        const ans = ansByQ.get(qid);

        // variantlarni o'quvchi ko'rgan tartibda
        const rawOpts = (q.options ?? []).map((o) => ({
          id: oid(o._id),
          text: o.text,
        }));
        const servedIds = servedOpts.get(qid);
        const options = servedIds && servedIds.length
          ? servedIds
              .map((sid) => rawOpts.find((o) => o.id === sid))
              .filter(Boolean)
          : rawOpts;

        // to'g'rilikni qayta hisoblaymiz (attempt.correct ishonchsiz bo'lsa)
        let correct = ans?.correct;
        if (typeof correct !== "boolean" && ans) {
          correct =
            q.type === "short"
              ? !!q.correctText &&
                normText(ans.text) === normText(q.correctText) &&
                normText(ans.text) !== ""
              : !!ans.optionId && ans.optionId === q.correctOptionId;
        }

        return {
          index: i + 1,
          id: qid,
          type: q.type,
          text: q.text,
          imageUrl: q.imageUrl ?? undefined,
          points: q.points ?? 1,
          options,
          answered: !!(ans && (ans.optionId || ans.text)),
          yourOptionId: ans?.optionId ?? undefined,
          yourText: ans?.text ?? undefined,
          correct: !!correct,
          // faqat yopilganda oshkor
          correctOptionId: reveal ? q.correctOptionId ?? undefined : undefined,
          correctText: reveal ? q.correctText ?? undefined : undefined,
        };
      })
      .filter(Boolean);

    return json({ reveal, review });
  }
);
