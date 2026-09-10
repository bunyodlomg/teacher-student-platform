import { json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { User } from "@/server/models";
import {
  countFiles,
  isScope,
  loadPublicTarget,
  withFiles,
} from "@/server/materials";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ochiq material havolasining meta ma'lumoti (kirish sahifasi uchun).
 * Fayllar bu yerda YUBORILMAYDI — ular `enter` dan keyin beriladi, shunda
 * har bir yuklab olish egasi ma'lum bo'ladi.
 */
export const GET = async (
  _req: Request,
  ctx: { params: { scope: string; id: string } }
) => {
  const { scope, id } = ctx.params;
  if (!isScope(scope)) return notFound();

  await connectDB();
  const target = await loadPublicTarget(scope, id);
  if (!target) return err("Bu material ochiq emas yoki topilmadi", 404);

  const files = withFiles(target.posts);
  if (files.length === 0) return err("Bu yerda hali material yo'q", 404);

  const teacher = await User.findById(target.group.teacherId, { name: 1 })
    .lean()
    .exec();

  return json({
    target: {
      scope,
      id,
      title: scope === "p" ? target.post!.title : target.group.name,
      groupName: target.group.name,
      subject: target.group.subject ?? "",
      emoji: target.group.emoji ?? "📘",
      description:
        scope === "p" ? target.post!.body ?? "" : target.group.description ?? "",
      teacherName: teacher?.name ?? "",
      lessonCount: files.length,
      fileCount: countFiles(files),
    },
  });
};
