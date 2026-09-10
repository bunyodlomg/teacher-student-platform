import { json } from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, Post } from "@/server/models";
import { countFiles } from "@/server/materials";
import type { PublicMaterialSource } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Loginsiz ochiq materiallar ro'yxati — landing sahifasi uchun.
 * Fayl havolalari YUBORILMAYDI: ular faqat ism kiritilgandan keyin beriladi.
 */
export const GET = async () => {
  await connectDB();

  const groups = await Group.find(
    { materialsPublic: true },
    { name: 1, subject: 1, emoji: 1, description: 1 }
  )
    .sort({ name: 1 })
    .lean()
    .exec();

  const groupIds = groups.map((g) => g._id);
  const posts = await Post.find(
    {
      $or: [
        { groupId: { $in: groupIds }, type: { $in: ["lesson", "announcement"] } },
        { isPublic: true },
      ],
    },
    { groupId: 1, title: 1, attachments: 1, isPublic: 1, type: 1, createdAt: 1 }
  )
    .lean()
    .exec();

  const openGroupIds = new Set(groupIds.map((g) => g.toString()));
  const withFiles = posts.filter((p) => (p.attachments ?? []).length > 0);

  const sources: PublicMaterialSource[] = [];

  for (const g of groups) {
    const gid = g._id.toString();
    const own = withFiles.filter((p) => p.groupId.toString() === gid);
    if (own.length === 0) continue;
    sources.push({
      scope: "g",
      id: gid,
      title: g.name,
      subject: g.subject ?? "",
      emoji: g.emoji ?? "📘",
      description: g.description ?? "",
      lessonCount: own.length,
      fileCount: countFiles(own),
    });
  }

  // Guruhi ochiq bo'lmagan, alohida ulashilgan darslar
  for (const p of withFiles) {
    if (!p.isPublic) continue;
    if (openGroupIds.has(p.groupId.toString())) continue;
    sources.push({
      scope: "p",
      id: p._id.toString(),
      title: p.title,
      subject: "",
      emoji: "📄",
      description: "",
      lessonCount: 1,
      fileCount: (p.attachments ?? []).length,
    });
  }

  return json({ sources });
};
