import { withAuth, requireUser, requireRole, json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, User } from "@/server/models";
import { sGroup } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  name?: string;
  subject?: string;
  description?: string;
  teacherId?: string;
  studentIds?: string[];
}

export const POST = withAuth(async (req: Request) => {
  const me = await requireUser();
  requireRole(me, "admin");

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }

  const name = (b.name || "").trim();
  const subject = (b.subject || "").trim();
  if (!name || !subject || !b.teacherId)
    return err("Nomi, yo'nalishi va o'qituvchi majburiy");

  await connectDB();
  const teacher = await User.findById(b.teacherId).lean().exec();
  if (!teacher || teacher.role !== "teacher")
    return notFound();

  const group = await Group.create({
    name,
    subject,
    description: (b.description || "").trim(),
    teacherId: teacher._id,
    studentIds: Array.isArray(b.studentIds) ? b.studentIds : [],
  });

  return json({ group: sGroup(group.toObject()) });
});
