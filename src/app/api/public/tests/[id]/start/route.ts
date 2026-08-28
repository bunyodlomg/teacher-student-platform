import { json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, TestAttempt } from "@/server/models";
import { sTestAttempt } from "@/server/serialize";
import { shuffled, buildExam } from "@/server/tests";
import { Types } from "mongoose";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const oid = (v: unknown) => (v as { toString(): string }).toString();

interface Body {
  name?: string;
  grade?: string;
  phone?: string;
}

interface RawQ {
  _id: unknown;
  options?: { _id: unknown }[];
  points?: number;
}

/**
 * Mehmon (loginsiz) test urinishini boshlaydi. Ism majburiy.
 * Har chaqiruv YANGI urinish yaratadi (mehmonда barqaror identifikator yo'q),
 * shu sabab studentId sifatida sintetik (noyob) ObjectId ishlatiladi.
 */
export const POST = async (req: Request, ctx: { params: { id: string } }) => {
  let b: Body;
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }

  const name = (b.name || "").trim();
  const grade = (b.grade || "").trim();
  const phone = (b.phone || "").trim();
  if (!name) return err("Ism-familiyani kiriting");
  if (!phone) return err("Ota-ona telefon raqamini kiriting");
  if (phone.replace(/\D/g, "").length < 7)
    return err("Telefon raqami to'liq emas");

  await connectDB();
  let test;
  try {
    test = await Test.findById(ctx.params.id).exec();
  } catch {
    return err("Noto'g'ri havola");
  }
  if (!test) return notFound();
  if (!test.isPublic) return err("Bu test ochiq emas", 403);
  if (test.status !== "open") return err("Test hozircha ochiq emas", 409);

  const qs = (test.questions ?? []) as unknown as RawQ[];
  const order = test.shuffleQuestions ? shuffled(qs) : qs;
  const served = order.map((q) => {
    const opts = (q.options ?? []).map((o) => oid(o._id));
    return {
      questionId: oid(q._id),
      optionIds: test.shuffleOptions ? shuffled(opts) : opts,
    };
  });

  const token = randomBytes(16).toString("hex");
  const endsAt = new Date(Date.now() + (test.durationMin ?? 30) * 60_000);

  const attempt = await TestAttempt.create({
    testId: test._id,
    studentId: new Types.ObjectId(), // sintetik — hech qaysi foydalanuvchiga tegishli emas
    isGuest: true,
    guest: { name, grade, phone },
    guestToken: token,
    startedAt: new Date(),
    endsAt,
    status: "in_progress",
    maxScore: qs.reduce((s, q) => s + (q.points ?? 1), 0),
    totalCount: qs.length,
    answers: [],
    served,
  });

  return json({
    attempt: sTestAttempt(attempt.toObject()),
    token,
    questions: buildExam(
      test.toObject() as unknown as { questions?: never },
      served
    ),
  });
};
