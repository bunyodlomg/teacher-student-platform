import { withAuth, requireUser, json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt } from "@/server/models";
import { sTestAttempt } from "@/server/serialize";
import { emitToUser } from "@/server/io";
import { notify } from "@/server/notify";
import { VIOLATION_TYPES, enforceViolationLimit } from "@/server/tests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  type?: string;
}

/**
 * Qoida buzilishini qayd etadi (fokus yo'qolishi, fullscreen'dan chiqish, …).
 * Limitdan (`test.maxViolations`) oshsa urinish serverda majburiy yopiladi —
 * bu qaror klientga ishonib topshirilmaydi.
 */
export const POST = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();

    let b: Body;
    try {
      b = await req.json();
    } catch {
      b = {};
    }
    const type = VIOLATION_TYPES.includes(b.type as never)
      ? (b.type as string)
      : "blur";

    await connectDB();

    const test = await Test.findById(ctx.params.id).exec();
    if (!test) return notFound();

    const attempt = await TestAttempt.findOne({
      testId: test._id,
      studentId: me._id,
    }).exec();
    if (!attempt) return notFound();
    if (attempt.status !== "in_progress") return err("Urinish yopilgan", 409);

    const forced = await enforceViolationLimit(test, attempt, type);
    const dto = sTestAttempt(attempt.toObject());

    // O'qituvchiga jonli monitoring
    emitToUser(test.authorId.toString(), "test:attempt-updated", dto);
    if (forced) {
      await notify({
        userId: test.authorId.toString(),
        type: "grade",
        title: "Test majburiy yopildi",
        body: `${me.name}: qoida buzilishi limitidan oshdi (${dto.violations})`,
        groupId: test.groupId.toString(),
        link: `/teacher/tests/${test._id.toString()}`,
      });
    }

    return json({
      violations: dto.violations,
      maxViolations: test.maxViolations ?? 3,
      autoSubmitted: forced,
      attempt: forced ? dto : undefined,
    });
  }
);
