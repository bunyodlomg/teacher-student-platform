import { withAuth, requireUser, json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, Post } from "@/server/models";
import { sPost } from "@/server/serialize";
import { emitToGroup } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function canAccessGroup(
  me: { _id: { toString(): string }; role: string },
  groupId: string
) {
  if (me.role === "admin") return true;
  const group = await Group.findById(groupId).lean().exec();
  if (!group) return false;
  if (me.role === "teacher") return group.teacherId.toString() === me._id.toString();
  return group.studentIds.some((s) => s.toString() === me._id.toString());
}

export const POST = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    let b: { body?: string };
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }
    const body = (b.body || "").trim();
    if (!body) return err("Izoh bo'sh bo'lishi mumkin emas");

    await connectDB();
    const post = await Post.findById(ctx.params.id).exec();
    if (!post) return notFound();
    if (!(await canAccessGroup(me, post.groupId.toString()))) return forbidden();

    post.comments.push({
      authorId: me._id,
      body,
      createdAt: new Date(),
    } as never);
    await post.save();

    const serialized = sPost(post.toObject());
    emitToGroup(post.groupId.toString(), "feed:post-updated", serialized);
    return json({ post: serialized });
  }
);
