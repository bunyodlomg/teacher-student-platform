import { withAuth, requireUser, json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt } from "@/server/models";
import { sTestAttempt } from "@/server/serialize";
import { emitToUser } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Fokus yo'qolishi / fullscreen chiqishini qayd etadi (in_progress urinishda). */
export const POST = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    await connectDB();

    const attempt = await TestAttempt.findOne({
      testId: ctx.params.id,
      studentId: me._id,
    }).exec();
    if (!attempt) return notFound();
    if (attempt.status !== "in_progress")
      return err("Urinish yopilgan", 409);

    attempt.violations = (attempt.violations ?? 0) + 1;
    await attempt.save();

    // O'qituvchiga jonli monitoring
    const test = await Test.findById(ctx.params.id, { authorId: 1 }).lean().exec();
    if (test)
      emitToUser(
        test.authorId.toString(),
        "test:attempt-updated",
        sTestAttempt(attempt.toObject())
      );

    return json({ violations: attempt.violations });
  }
);
