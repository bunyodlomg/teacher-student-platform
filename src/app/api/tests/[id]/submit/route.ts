import { withAuth, requireUser, json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt } from "@/server/models";
import { sTestAttempt } from "@/server/serialize";
import { gradeAttempt } from "@/server/tests";
import { emitToUser } from "@/server/io";
import { notify } from "@/server/notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface InAnswer {
  questionId?: string;
  optionId?: string;
  text?: string;
}
interface Body {
  answers?: InAnswer[];
  violations?: number;
}

export const POST = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    let b: Body;
    try {
      b = await req.json();
    } catch {
      b = {};
    }

    await connectDB();
    const test = await Test.findById(ctx.params.id).exec();
    if (!test) return notFound();
    const attempt = await TestAttempt.findOne({
      testId: test._id,
      studentId: me._id,
    }).exec();
    if (!attempt) return notFound();
    if (attempt.status !== "in_progress")
      return json({ attempt: sTestAttempt(attempt.toObject()) });

    // Klient yakuniy javoblarni yuboradi (xavfsizlik uchun serverga qayta yozamiz)
    if (Array.isArray(b.answers)) {
      attempt.set(
        "answers",
        b.answers
          .filter((a) => a.questionId)
          .map((a) => ({
            questionId: a.questionId,
            optionId: a.optionId,
            text: a.text,
          }))
      );
    }
    if (Number(b.violations) >= 0)
      attempt.violations = Math.max(attempt.violations ?? 0, Number(b.violations));

    const overtime = Date.now() > new Date(attempt.endsAt).getTime() + 5000;
    const g = gradeAttempt(test, attempt);
    attempt.set(g);
    attempt.status = overtime ? "auto_submitted" : "submitted";
    attempt.submittedAt = new Date();
    attempt.markModified("answers");
    await attempt.save();

    const dto = sTestAttempt(attempt.toObject());

    // O'qituvchiga real-time natija + bildirishnoma
    emitToUser(test.authorId.toString(), "test:attempt-updated", dto);
    await notify({
      userId: test.authorId.toString(),
      type: "grade",
      title: "Test topshirildi",
      body: `${me.name}: ${dto.score}/${dto.maxScore} (${dto.correctCount}/${dto.totalCount})`,
      groupId: test.groupId.toString(),
      link: `/teacher/tests/${test._id.toString()}`,
    });

    return json({ attempt: dto });
  }
);
