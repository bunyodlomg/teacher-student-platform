import { withAuth, requireUser, json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Assignment, Post, Submission } from "@/server/models";
import { sAssignment, sPost } from "@/server/serialize";
import { emitToGroup } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  title?: string;
  body?: string;
  tags?: string[];
  attachments?: { kind: string; name: string; meta?: string; url?: string }[];
  pinned?: boolean;
}

function canManage(
  me: { _id: { toString(): string }; role: string },
  authorId: { toString(): string }
) {
  return me.role === "admin" || authorId.toString() === me._id.toString();
}

/** Edit a post (author or admin). Keeps a linked assignment in sync. */
export const PATCH = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();

    let b: Body;
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }

    await connectDB();
    const post = await Post.findById(ctx.params.id).exec();
    if (!post) return notFound();
    if (!canManage(me, post.authorId)) return forbidden();

    if (typeof b.title === "string") {
      const t = b.title.trim();
      if (!t) return err("Sarlavha bo'sh bo'lmasligi kerak");
      post.title = t;
    }
    if (typeof b.body === "string") post.body = b.body.trim();
    if (Array.isArray(b.tags)) post.tags = b.tags as never;
    if (Array.isArray(b.attachments)) post.attachments = b.attachments as never;
    if (typeof b.pinned === "boolean") post.pinned = b.pinned;
    await post.save();

    // keep a linked assignment's shared fields in sync
    let serializedAssignment = null;
    if (post.assignmentId) {
      const a = await Assignment.findById(post.assignmentId).exec();
      if (a) {
        if (typeof b.title === "string") a.title = post.title;
        if (typeof b.body === "string") a.description = post.body || post.title;
        if (Array.isArray(b.attachments)) a.attachments = b.attachments as never;
        await a.save();
        serializedAssignment = sAssignment(a.toObject());
        emitToGroup(post.groupId.toString(), "assignment:new", serializedAssignment);
      }
    }

    const serialized = sPost(post.toObject());
    emitToGroup(post.groupId.toString(), "feed:post-updated", serialized);
    return json({ post: serialized, assignment: serializedAssignment });
  }
);

/** Delete a post (author or admin). Also removes a linked assignment + its
 *  submissions so nothing is orphaned. */
export const DELETE = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();

    await connectDB();
    const post = await Post.findById(ctx.params.id).exec();
    if (!post) return notFound();
    if (!canManage(me, post.authorId)) return forbidden();

    const groupId = post.groupId.toString();
    const assignmentId = post.assignmentId?.toString();

    if (post.assignmentId) {
      await Submission.deleteMany({ assignmentId: post.assignmentId }).exec();
      await Assignment.findByIdAndDelete(post.assignmentId).exec();
    }
    await post.deleteOne();

    emitToGroup(groupId, "feed:post-deleted", {
      id: ctx.params.id,
      assignmentId,
    });
    return json({ ok: true, id: ctx.params.id, assignmentId });
  }
);
