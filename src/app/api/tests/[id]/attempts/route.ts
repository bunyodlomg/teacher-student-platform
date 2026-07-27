import {
  withAuth,
  requireUser,
  requireRole,
  json,
  notFound,
  forbidden,
} from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt } from "@/server/models";
import { sTestAttempt } from "@/server/serialize";
import { gradeAttempt } from "@/server/tests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Testning barcha urinishlari (o'qituvchi). Muddati o'tganlarni yakunlaydi. */
export const GET = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    requireRole(me, "teacher", "admin");

    await connectDB();
    const test = await Test.findById(ctx.params.id).exec();
    if (!test) return notFound();
    if (me.role !== "admin" && test.authorId.toString() !== me._id.toString())
      return forbidden();

    const attempts = await TestAttempt.find({ testId: test._id }).exec();

    // Vaqti tugagan, ammo hali topshirilmagan urinishlarni avto-yakunlash
    for (const a of attempts) {
      if (
        a.status === "in_progress" &&
        Date.now() > new Date(a.endsAt).getTime()
      ) {
        const g = gradeAttempt(test, a);
        a.set(g);
        a.status = "auto_submitted";
        a.submittedAt = new Date(a.endsAt);
        a.markModified("answers");
        await a.save();
      }
    }

    return json({ attempts: attempts.map((a) => sTestAttempt(a.toObject())) });
  }
);
