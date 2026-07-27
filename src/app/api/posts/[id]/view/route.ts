import { withAuth, requireUser, json, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, Post } from "@/server/models";

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

/**
 * Register that the current user has seen this post. Idempotent — `$addToSet`
 * guarantees one user is only ever counted once. The author's own views are
 * not counted, so the number reflects the audience that actually saw it.
 */
export const POST = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();

    await connectDB();
    const post = await Post.findById(ctx.params.id)
      .select("groupId authorId views")
      .exec();
    if (!post) return notFound();
    if (!(await canAccessGroup(me, post.groupId.toString()))) return forbidden();

    const uid = me._id.toString();
    if (post.authorId.toString() !== uid) {
      await Post.updateOne(
        { _id: post._id },
        { $addToSet: { views: me._id } }
      ).exec();
    }

    const fresh = await Post.findById(post._id).select("views").lean().exec();
    return json({ viewCount: fresh?.views?.length ?? 0 });
  }
);
