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
    let b: { emoji?: string };
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }
    const emoji = (b.emoji || "").trim();
    if (!emoji) return err("Emoji majburiy");

    await connectDB();
    const post = await Post.findById(ctx.params.id).exec();
    if (!post) return notFound();
    if (!(await canAccessGroup(me, post.groupId.toString()))) return forbidden();

    const uid = me._id.toString();
    const idx = post.reactions.findIndex(
      (r) => r.userId.toString() === uid && r.emoji === emoji
    );
    if (idx >= 0) post.reactions.splice(idx, 1);
    else post.reactions.push({ userId: me._id, emoji } as never);
    await post.save();

    const serialized = sPost(post.toObject());
    emitToGroup(post.groupId.toString(), "feed:post-updated", serialized);
    return json({ post: serialized });
  }
);
