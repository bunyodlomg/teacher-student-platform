import {
  withAuth,
  requireUser,
  json,
  err,
  notFound,
  forbidden,
} from "@/server/api";
import { connectDB } from "@/server/db";
import {
  Group,
  Post,
  Assignment,
  Submission,
  Test,
  TestAttempt,
  Conversation,
  Message,
  Announcement,
} from "@/server/models";
import { sGroup } from "@/server/serialize";
import { emitToUsers } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  name?: string;
  subject?: string;
  description?: string;
}

/** Owning teacher or admin only. */
async function loadOwned(id: string, meId: string, role: string) {
  await connectDB();
  const group = await Group.findById(id).exec();
  if (!group) return { error: notFound() as Response };
  if (role !== "admin" && group.teacherId.toString() !== meId)
    return { error: forbidden() as Response };
  return { group };
}

/** Members + owner — for live refresh after a change. */
function affectedIds(group: {
  teacherId: { toString(): string };
  studentIds: { toString(): string }[];
}): string[] {
  return [
    group.teacherId.toString(),
    ...(group.studentIds ?? []).map((s) => s.toString()),
  ];
}

/** Edit a group's name / subject / description. */
export const PATCH = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    if (me.role === "student") return forbidden();

    let b: Body;
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }

    const { group, error } = await loadOwned(
      ctx.params.id,
      me._id.toString(),
      me.role
    );
    if (error) return error;
    if (!group) return notFound();

    if (typeof b.name === "string" && b.name.trim()) group.name = b.name.trim();
    if (typeof b.subject === "string" && b.subject.trim())
      group.subject = b.subject.trim();
    if (typeof b.description === "string")
      group.description = b.description.trim();

    await group.save();

    const dto = sGroup(group.toObject());
    emitToUsers(affectedIds(group), "group:updated", dto);
    return json({ group: dto });
  }
);

/** Delete a group and everything scoped to it. */
export const DELETE = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    if (me.role === "student") return forbidden();

    const { group, error } = await loadOwned(
      ctx.params.id,
      me._id.toString(),
      me.role
    );
    if (error) return error;
    if (!group) return notFound();

    const groupId = group._id;
    const members = affectedIds(group);

    // scoped assignments → their submissions
    const assignmentIds = (
      await Assignment.find({ groupId }, { _id: 1 }).lean().exec()
    ).map((a) => a._id);
    // scoped group conversation → its messages
    const convs = await Conversation.find(
      { kind: "group", groupId },
      { _id: 1 }
    )
      .lean()
      .exec();
    const convIds = convs.map((c) => c._id);

    await Promise.all([
      Post.deleteMany({ groupId }).exec(),
      Submission.deleteMany({ assignmentId: { $in: assignmentIds } }).exec(),
      Assignment.deleteMany({ groupId }).exec(),
      TestAttempt.deleteMany({
        testId: {
          $in: (await Test.find({ groupId }, { _id: 1 }).lean().exec()).map(
            (t) => t._id
          ),
        },
      }).exec(),
      Test.deleteMany({ groupId }).exec(),
      Message.deleteMany({ conversationId: { $in: convIds } }).exec(),
      Conversation.deleteMany({ _id: { $in: convIds } }).exec(),
      Announcement.deleteMany({ groupId }).exec(),
    ]);

    await group.deleteOne();

    emitToUsers(members, "group:deleted", { id: ctx.params.id });
    return json({ id: ctx.params.id });
  }
);
