import { withAuth, requireUser, json, err } from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, User } from "@/server/models";
import { sGroup } from "@/server/serialize";
import { emitToUsers } from "@/server/io";
import { notify } from "@/server/notify";
import type { Types } from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  name?: string;
  subject?: string;
  description?: string;
  teacherId?: string;
  studentIds?: string[];
}

/**
 * Create a group. Any authenticated user may create one:
 *  - a teacher becomes the group's owner automatically;
 *  - a student/admin must pick a teacher, and a student creator auto-joins.
 */
export const POST = withAuth(async (req: Request) => {
  const me = await requireUser();

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }

  const name = (b.name || "").trim();
  const subject = (b.subject || "").trim();
  if (!name || !subject) return err("Nomi va yo'nalishi majburiy");

  await connectDB();

  // resolve owning teacher
  let teacherId: Types.ObjectId;
  if (me.role === "teacher") {
    teacherId = me._id;
  } else {
    if (!b.teacherId) return err("O'qituvchini tanlang");
    const t = await User.findById(b.teacherId).lean().exec();
    if (!t || t.role !== "teacher") return err("O'qituvchi topilmadi");
    teacherId = t._id;
  }

  // validate students
  let studentIds: Types.ObjectId[] = [];
  if (Array.isArray(b.studentIds) && b.studentIds.length) {
    const valid = await User.find(
      { _id: { $in: b.studentIds }, role: "student" },
      { _id: 1 }
    )
      .lean()
      .exec();
    studentIds = valid.map((u) => u._id);
  }
  // a student creator joins their own group
  if (
    me.role === "student" &&
    !studentIds.some((id) => id.toString() === me._id.toString())
  ) {
    studentIds.push(me._id);
  }

  const group = await Group.create({
    name,
    subject,
    description: (b.description || "").trim(),
    teacherId,
    studentIds,
  });

  // tell the teacher + members (and creator) to refresh their scoped state
  const ids = Array.from(
    new Set([
      teacherId.toString(),
      me._id.toString(),
      ...studentIds.map((s) => s.toString()),
    ])
  );
  emitToUsers(ids, "state:refresh", { groupId: group._id.toString() });

  // notify the teacher if someone else created the group for them
  if (teacherId.toString() !== me._id.toString()) {
    await notify({
      userId: teacherId.toString(),
      type: "announcement",
      title: "Yangi guruhga biriktirildingiz",
      body: name,
      groupId: group._id.toString(),
      link: `/teacher/groups/${group._id.toString()}`,
    });
  }

  return json({ group: sGroup(group.toObject()) });
});
