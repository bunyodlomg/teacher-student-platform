import { json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { Test } from "@/server/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Bitta ochiq testning meta ma'lumoti (intro sahifasi uchun). */
export const GET = async (
  _req: Request,
  ctx: { params: { id: string } }
) => {
  await connectDB();
  let t;
  try {
    t = await Test.findById(ctx.params.id).lean().exec();
  } catch {
    return err("Noto'g'ri havola");
  }
  if (!t) return notFound();
  if (!t.isPublic) return err("Bu test ochiq emas", 403);
  if (t.status !== "open") return err("Test hozircha ochiq emas", 409);

  return json({
    test: {
      id: t._id.toString(),
      title: t.title,
      subject: t.subject ?? "",
      description: t.description ?? "",
      durationMin: t.durationMin ?? 30,
      questionCount: (t.questions ?? []).length,
    },
  });
};
