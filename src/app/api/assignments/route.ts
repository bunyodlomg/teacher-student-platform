import { withAuth, requireUser, requireRole, json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Assignment, Group, Post } from "@/server/models";
import { sAssignment, sPost } from "@/server/serialize";
import { notifyMany } from "@/server/notify";
import { emitToGroup } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  groupId?: string;
  title?: string;
  description?: string;
  dueDate?: string;
  points?: number;
  attachments?: { kind: string; name: string; meta?: string }[];
  announcement?: string;
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

  const title = (b.title || "").trim();
  if (!b.groupId || !title) return err("Guruh va sarlavha majburiy");
  const points = Number(b.points) > 0 ? Number(b.points) : 100;
  const dueDate = b.dueDate ? new Date(b.dueDate) : new Date();

  await connectDB();
  const group = await Group.findById(b.groupId).lean().exec();
  if (!group) return notFound();
  if (me.role === "teacher" && group.teacherId.toString() !== me._id.toString())
    return forbidden();

  const attachments = Array.isArray(b.attachments) ? b.attachments : [];

  const assignment = await Assignment.create({
    groupId: group._id,
    title,
    description: (b.description || "").trim(),
    dueDate,
    points,
    attachments,
  });

  // companion feed post
  const post = await Post.create({
    groupId: group._id,
    authorId: me._id,
    type: "assignment",
    title,
    body: (b.announcement || b.description || "").slice(0, 280),
    assignmentId: assignment._id,
    attachments,
  });

  const sa = sAssignment(assignment.toObject());
  const sp = sPost(post.toObject());
  emitToGroup(group._id.toString(), "assignment:new", sa);
  emitToGroup(group._id.toString(), "feed:new-post", sp);

  await notifyMany(group.studentIds.map((s) => s.toString()), () => ({
    type: "assignment",
    title: `${group.name}da yangi topshiriq`,
    body: title,
    groupId: group._id.toString(),
    link: `/student/groups/${group._id.toString()}`,
  }));

  return json({ assignment: sa, post: sp });
});
