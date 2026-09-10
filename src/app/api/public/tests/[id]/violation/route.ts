import { json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt } from "@/server/models";
import { sTestAttempt } from "@/server/serialize";
import { emitToUser } from "@/server/io";
import { VIOLATION_TYPES, enforceViolationLimit } from "@/server/tests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  attemptId?: string;
  token?: string;
  type?: string;
}

/**
 * Mehmon (loginsiz) urinishidagi qoida buzilishi. Ro'yxatdan o'tgan o'quvchi
 * bilan bir xil qoida: limitdan oshsa urinish serverda majburiy yopiladi.
 */
export const POST = async (req: Request, ctx: { params: { id: string } }) => {
  let b: Body;
  try {
    b = await req.json();
  } catch {
    b = {};
  }
  if (!b.attemptId || !b.token) return err("Urinish aniqlanmadi");

  const type = VIOLATION_TYPES.includes(b.type as never)
    ? (b.type as string)
    : "blur";

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
  if (attempt.status !== "in_progress") return err("Urinish yopilgan", 409);

  const forced = await enforceViolationLimit(test, attempt, type);
  const dto = sTestAttempt(attempt.toObject());

  emitToUser(test.authorId.toString(), "test:attempt-updated", dto);

  return json({
    violations: dto.violations,
    maxViolations: test.maxViolations ?? 3,
    autoSubmitted: forced,
    attempt: forced ? dto : undefined,
  });
};
