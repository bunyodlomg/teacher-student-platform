import { withAuth, requireUser, requireRole, json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, User } from "@/server/models";
import { sGroup } from "@/server/serialize";
import { notify } from "@/server/notify";
import { emitToUsers } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  name?: string;
  subject?: string;
  description?: string;
  teacherId?: string;
  studentIds?: string[];
}

/** Update a group — fields and/or its full student roster. */
export const PATCH = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    requireRole(me, "admin");

    let b: Body;
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }

    await connectDB();
    const group = await Group.findById(ctx.params.id).exec();
    if (!group) return notFound();

    const before = new Set(group.studentIds.map((s) => s.toString()));

    if (typeof b.name === "string") group.name = b.name.trim();
    if (typeof b.subject === "string") group.subject = b.subject.trim();
    if (typeof b.description === "string") group.description = b.description.trim();
    if (b.teacherId) {
      const t = await User.findById(b.teacherId).lean().exec();
      if (t && t.role === "teacher") group.teacherId = t._id;
    }
    if (Array.isArray(b.studentIds)) {
      // keep only valid student ids
      const valid = await User.find(
        { _id: { $in: b.studentIds }, role: "student" },
        { _id: 1 }
      )
        .lean()
        .exec();
      group.studentIds = valid.map((u) => u._id) as never;
    }

    await group.save();

    // notify newly added students
    const after = group.studentIds.map((s) => s.toString());
    const added = after.filter((idStr) => !before.has(idStr));
    const removed = [...before].filter((idStr) => !after.includes(idStr));
    await Promise.all(
      added.map((sid) =>
        notify({
          userId: sid,
          type: "announcement",
          title: "Yangi guruhga qo'shildingiz",
          body: group.name,
          groupId: group._id.toString(),
          link: `/student/groups/${group._id.toString()}`,
        })
      )
    );

    // Push a live refresh to everyone whose scope changed (added/removed
    // students + the group's teacher) so their groups/feeds update without a
    // manual reload, and their socket rejoins the right rooms.
    emitToUsers(
      [...added, ...removed, group.teacherId.toString()],
      "state:refresh",
      { groupId: group._id.toString() }
    );

    return json({ group: sGroup(group.toObject()) });
  }
);
