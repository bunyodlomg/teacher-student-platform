import { withAuth, requireUser, requireRole, json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, Post } from "@/server/models";
import { sPost } from "@/server/serialize";
import { notifyMany } from "@/server/notify";
import { emitToGroup } from "@/server/io";
import type { NotificationType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  groupId?: string;
  type?: "lesson" | "announcement";
  title?: string;
  body?: string;
  tags?: string[];
  attachments?: { kind: string; name: string; meta?: string }[];
}

export const POST = withAuth(async (req: Request) => {
  const me = await requireUser();
  requireRole(me, "teacher", "admin");

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }

  const type = b.type === "announcement" ? "announcement" : "lesson";
  const title = (b.title || "").trim();
  if (!b.groupId || !title) return err("Guruh va sarlavha majburiy");

  await connectDB();
  const group = await Group.findById(b.groupId).lean().exec();
  if (!group) return notFound();
  if (me.role === "teacher" && group.teacherId.toString() !== me._id.toString())
    return forbidden();

  const post = await Post.create({
    groupId: group._id,
    authorId: me._id,
    type,
    title,
    body: (b.body || "").trim(),
    tags: Array.isArray(b.tags) ? b.tags : [],
    attachments: Array.isArray(b.attachments) ? b.attachments : [],
  });

  const serialized = sPost(post.toObject());
  emitToGroup(group._id.toString(), "feed:new-post", serialized);

  const notifType: NotificationType =
    type === "announcement" ? "announcement" : "lesson";
  await notifyMany(group.studentIds.map((s) => s.toString()), () => ({
    type: notifType,
    title:
      type === "announcement"
        ? `${group.name}da e'lon`
        : `${group.name}da yangi dars`,
    body: title,
    groupId: group._id.toString(),
    link: `/student/groups/${group._id.toString()}`,
  }));

  return json({ post: serialized });
});
