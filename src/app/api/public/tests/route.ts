import { json } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test } from "@/server/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ochiq (loginsiz) va ochiq holatдаgi testlar ro'yxati — landing sahifasi uchun.
 * Autentifikatsiya talab qilmaydi; savol/javoblar YUBORILMAYDI.
 */
export const GET = async () => {
  await connectDB();
  const tests = await Test.find(
    { isPublic: true, status: "open" },
    {
      title: 1,
      subject: 1,
      description: 1,
      durationMin: 1,
      questions: 1,
      createdAt: 1,
    }
  )
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return json({
    tests: tests.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      subject: t.subject ?? "",
      description: t.description ?? "",
      durationMin: t.durationMin ?? 30,
      questionCount: (t.questions ?? []).length,
    })),
  });
};
