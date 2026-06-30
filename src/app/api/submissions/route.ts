import { withAuth, requireUser, requireRole, json, err, notFound, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { Assignment, Group, Submission } from "@/server/models";
import { sSubmission } from "@/server/serialize";
import { notify } from "@/server/notify";
import { emitToUser } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  assignmentId?: string;
  body?: string;
  attachments?: { kind: string; name: string; meta?: string }[];
  status?: "draft" | "submitted";
}

export const POST = withAuth(async (req: Request) => {
  const me = await requireUser();
  requireRole(me, "student");

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }
  if (!b.assignmentId) return err("Topshiriq ko'rsatilmagan");
  const status = b.status === "submitted" ? "submitted" : "draft";

  await connectDB();
  const assignment = await Assignment.findById(b.assignmentId).lean().exec();
  if (!assignment) return notFound();
  const group = await Group.findById(assignment.groupId).lean().exec();
  if (!group) return notFound();
  if (!group.studentIds.some((s) => s.toString() === me._id.toString()))
    return forbidden();

  const now = new Date();
  const attachments = Array.isArray(b.attachments) ? b.attachments : [];

  const sub = await Submission.findOneAndUpdate(
    { assignmentId: assignment._id, studentId: me._id },
    {
      $set: {
        body: b.body || "",
        attachments,
        status,
        ...(status === "submitted" ? { submittedAt: now } : {}),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

  const serialized = sSubmission(sub!.toObject());
  emitToUser(me._id.toString(), "submission:updated", serialized);

  if (status === "submitted") {
    emitToUser(group.teacherId.toString(), "submission:updated", serialized);
    await notify({
      userId: group.teacherId.toString(),
      type: "assignment",
      title: "Yangi ish topshirildi",
      body: `${me.name}: ${assignment.title}`,
      groupId: group._id.toString(),
      link: `/teacher/review`,
    });
  }

  return json({ submission: serialized });
});
