import { withAuth, requireUser, requireRole, json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Assignment, Group, Submission } from "@/server/models";
import { sSubmission } from "@/server/serialize";
import { notify } from "@/server/notify";
import { emitToUser } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  status?: "approved" | "rejected";
  score?: number;
  feedback?: string;
}

export const POST = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    requireRole(me, "teacher", "admin");

    let b: Body;
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }
    const status = b.status === "rejected" ? "rejected" : "approved";

    await connectDB();
    const sub = await Submission.findById(ctx.params.id).exec();
    if (!sub) return notFound();
    const assignment = await Assignment.findById(sub.assignmentId).lean().exec();
    if (!assignment) return notFound();
    const group = await Group.findById(assignment.groupId).lean().exec();
    if (!group) return notFound();
    if (me.role === "teacher" && group.teacherId.toString() !== me._id.toString())
      return forbidden();

    sub.status = status;
    if (typeof b.score === "number") sub.score = b.score;
    if (typeof b.feedback === "string") sub.feedback = b.feedback;
    await sub.save();

    const serialized = sSubmission(sub.toObject());
    const studentId = sub.studentId.toString();
    emitToUser(studentId, "submission:updated", serialized);
    emitToUser(group.teacherId.toString(), "submission:updated", serialized);

    await notify({
      userId: studentId,
      type: status === "approved" ? "grade" : "feedback",
      title:
        status === "approved"
          ? `Baholandi: ${b.score ?? ""}/${assignment.points}`
          : "Tuzatish kerak",
      body: assignment.title,
      groupId: group._id.toString(),
      link: `/student/assignments/${assignment._id.toString()}`,
    });

    return json({ submission: serialized });
  }
);
