import {
  withAuth,
  requireUser,
  json,
  err,
  notFound,
  forbidden,
} from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt, Group } from "@/server/models";
import { sTestAttempt } from "@/server/serialize";
import { shuffled, gradeAttempt } from "@/server/tests";
import type { ExamQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const oid = (v: unknown) => (v as { toString(): string }).toString();

interface RawOpt {
  _id: unknown;
  text: string;
}
interface RawQ {
  _id: unknown;
  type: string;
  text: string;
  imageUrl?: string;
  options?: RawOpt[];
  points?: number;
}

/** Saqlangan tartib (served) bo'yicha xavfsiz (javobsiz) savollarni quradi. */
function buildExam(
  test: { questions?: RawQ[] },
  served: { questionId: string; optionIds: string[] }[]
): ExamQuestion[] {
  const qById = new Map<string, RawQ>();
  for (const q of (test.questions ?? []) as RawQ[]) qById.set(oid(q._id), q);
  const out: ExamQuestion[] = [];
  for (const s of served) {
    const q = qById.get(s.questionId);
    if (!q) continue;
    const optById = new Map<string, RawOpt>();
    for (const o of q.options ?? []) optById.set(oid(o._id), o);
    out.push({
      id: s.questionId,
      type: q.type as ExamQuestion["type"],
      text: q.text,
      imageUrl: q.imageUrl || undefined,
      points: q.points ?? 1,
      options: s.optionIds
        .map((id) => optById.get(id))
        .filter((o): o is RawOpt => !!o)
        .map((o) => ({ id: oid(o._id), text: o.text })),
    });
  }
  return out;
}

export const POST = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    await connectDB();

    const test = await Test.findById(ctx.params.id).exec();
    if (!test) return notFound();
    if (test.status !== "open") return err("Test hozircha ochiq emas", 409);

    const group = await Group.findById(test.groupId).lean().exec();
    if (!group) return notFound();
    if (
      me.role === "student" &&
      !group.studentIds.some((s) => s.toString() === me._id.toString())
    )
      return forbidden();

    let attempt = await TestAttempt.findOne({
      testId: test._id,
      studentId: me._id,
    }).exec();

    // Allaqachon topshirilgan
    if (attempt && attempt.status !== "in_progress") {
      return err("Siz bu testni allaqachon topshirgansiz", 409);
    }

    // Davom etayotgan urinish — muddati o'tgan bo'lsa yakunlaymiz
    if (attempt && attempt.status === "in_progress") {
      if (Date.now() > new Date(attempt.endsAt).getTime()) {
        const g = gradeAttempt(test, attempt);
        attempt.set(g);
        attempt.status = "auto_submitted";
        attempt.submittedAt = new Date();
        await attempt.save();
        return err("Test vaqti tugagan", 409);
      }
      const served = (attempt.served ?? []).map((s) => ({
        questionId: s.questionId,
        optionIds: (s.optionIds ?? []) as string[],
      }));
      return json({
        attempt: sTestAttempt(attempt.toObject()),
        questions: buildExam(
          test.toObject() as unknown as { questions?: RawQ[] },
          served
        ),
      });
    }

    // Yangi urinish — savol/variant tartibini aralashtirib saqlaymiz
    const qs = (test.questions ?? []) as unknown as RawQ[];
    const order = test.shuffleQuestions ? shuffled(qs) : qs;
    const served = order.map((q) => {
      const opts = (q.options ?? []).map((o) => oid(o._id));
      return {
        questionId: oid(q._id),
        optionIds: test.shuffleOptions ? shuffled(opts) : opts,
      };
    });

    const endsAt = new Date(Date.now() + (test.durationMin ?? 30) * 60_000);
    try {
      attempt = await TestAttempt.create({
        testId: test._id,
        studentId: me._id,
        startedAt: new Date(),
        endsAt,
        status: "in_progress",
        maxScore: qs.reduce((s, q) => s + (q.points ?? 1), 0),
        totalCount: qs.length,
        answers: [],
        served,
      });
    } catch {
      // unique index poyga holati — mavjudini qayta o'qiymiz
      attempt = await TestAttempt.findOne({
        testId: test._id,
        studentId: me._id,
      }).exec();
      if (!attempt) return err("Urinish yaratilmadi");
    }

    return json({
      attempt: sTestAttempt(attempt.toObject()),
      questions: buildExam(
        test.toObject() as unknown as { questions?: RawQ[] },
        served
      ),
    });
  }
);
