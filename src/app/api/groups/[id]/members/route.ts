import { withAuth, requireUser, json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, User } from "@/server/models";
import { sGroup } from "@/server/serialize";
import { notify } from "@/server/notify";
import { emitToUsers } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  studentIds?: string[];
}

/**
 * Set a group's student roster. Usable by an admin (any group) or by the
 * teacher who owns the group — so teachers can add/remove their own students.
 */
export const PATCH = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();

    let b: Body;
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }
    if (!Array.isArray(b.studentIds)) return err("studentIds majburiy");

    await connectDB();
    const group = await Group.findById(ctx.params.id).exec();
    if (!group) return notFound();

    const isOwner = group.teacherId.toString() === me._id.toString();
    if (me.role !== "admin" && !(me.role === "teacher" && isOwner))
      return forbidden();

    const before = new Set(group.studentIds.map((s) => s.toString()));

    // keep only valid student ids
    const valid = await User.find(
      { _id: { $in: b.studentIds }, role: "student" },
      { _id: 1 }
    )
      .lean()
      .exec();
    group.studentIds = valid.map((u) => u._id) as never;
    await group.save();

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

    // live-refresh affected students + the owning teacher
    emitToUsers(
      [...added, ...removed, group.teacherId.toString()],
      "state:refresh",
      { groupId: group._id.toString() }
    );

    return json({ group: sGroup(group.toObject()) });
  }
);
