import { json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt } from "@/server/models";
import { sTestAttempt } from "@/server/serialize";
import { gradeAttempt } from "@/server/tests";
import { emitToUser } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface InAnswer {
  questionId?: string;
  optionId?: string;
  text?: string;
}
interface Body {
  attemptId?: string;
  token?: string;
  answers?: InAnswer[];
  violations?: number;
}

/** Mehmon test urinishini topshiradi (attemptId + token bilan). */
export const POST = async (req: Request, ctx: { params: { id: string } }) => {
  let b: Body;
  try {
    b = await req.json();
  } catch {
    b = {};
  }
  if (!b.attemptId || !b.token) return err("Urinish aniqlanmadi");

  await connectDB();
  let test;
  try {
    test = await Test.findById(ctx.params.id).exec();
  } catch {
    return err("Noto'g'ri havola");
  }
  if (!test) return notFound();

  const attempt = await TestAttempt.findById(b.attemptId).exec();
  if (!attempt) return notFound();
  if (
    !attempt.isGuest ||
    attempt.testId.toString() !== test._id.toString() ||
    attempt.guestToken !== b.token
  )
    return forbidden();

  if (attempt.status !== "in_progress")
    return json({ attempt: sTestAttempt(attempt.toObject()) });

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
  // O'qituvchiga real-time natija
  emitToUser(test.authorId.toString(), "test:attempt-updated", dto);

  return json({ attempt: dto });
};
