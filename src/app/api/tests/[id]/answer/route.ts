import { withAuth, requireUser, json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { TestAttempt } from "@/server/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  questionId?: string;
  optionId?: string;
  text?: string;
}

/** Bitta javobni avto-saqlash (debounced). Refresh/uzilishda ma'lumot yo'qolmaydi. */
export const POST = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    let b: Body;
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }
    if (!b.questionId) return err("questionId majburiy");

    await connectDB();
    const attempt = await TestAttempt.findOne({
      testId: ctx.params.id,
      studentId: me._id,
    }).exec();
    if (!attempt) return notFound();
    if (attempt.status !== "in_progress") return err("Urinish yopilgan", 409);
    // 5 soniya grace — muddat tugagach saqlashni to'xtatamiz
    if (Date.now() > new Date(attempt.endsAt).getTime() + 5000)
      return err("Vaqt tugagan", 409);

    const answers = attempt.answers as unknown as {
      questionId: string;
      optionId?: string;
      text?: string;
    }[];
    const existing = answers.find((a) => a.questionId === b.questionId);
    if (existing) {
      existing.optionId = b.optionId;
      existing.text = b.text;
    } else {
      answers.push({
        questionId: b.questionId,
        optionId: b.optionId,
        text: b.text,
      });
    }
    attempt.markModified("answers");
    await attempt.save();
    return json({ ok: true });
  }
);
