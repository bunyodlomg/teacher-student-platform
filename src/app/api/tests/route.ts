import {
  withAuth,
  requireUser,
  requireRole,
  json,
  err,
  notFound,
  forbidden,
} from "@/server/api";
import { connectDB } from "@/server/db";
import { Test, Group } from "@/server/models";
import { sTest } from "@/server/serialize";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface InQuestion {
  type?: string;
  text?: string;
  imageUrl?: string;
  options?: { text?: string }[];
  correctIndex?: number;
  correctText?: string;
  points?: number;
}
interface Body {
  groupId?: string;
  title?: string;
  subject?: string;
  description?: string;
  durationMin?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  maxViolations?: number;
  isPublic?: boolean;
  questions?: InQuestion[];
}

/** Kiruvchi savollarni tekshirib, Mongo subhujjatlariga (id bilan) aylantiradi. */
function buildQuestions(input: InQuestion[]): { questions: unknown[]; error?: string } {
  const questions: unknown[] = [];
  for (let i = 0; i < input.length; i++) {
    const q = input[i];
    const text = (q.text || "").trim();
    if (!text) return { questions: [], error: `${i + 1}-savol matni bo'sh` };
    const type = q.type === "boolean" || q.type === "short" ? q.type : "single";
    const points = Number(q.points) > 0 ? Number(q.points) : 1;

    if (type === "short") {
      const correctText = (q.correctText || "").trim();
      if (!correctText)
        return { questions: [], error: `${i + 1}-savol: to'g'ri javob kiritilmagan` };
      questions.push({
        _id: new Types.ObjectId(),
        type,
        text,
        imageUrl: q.imageUrl || undefined,
        options: [],
        correctText,
        points,
      });
      continue;
    }

    const rawOpts = Array.isArray(q.options) ? q.options : [];
    const opts = rawOpts
      .map((o) => ({ _id: new Types.ObjectId(), text: (o.text || "").trim() }))
      .filter((o) => o.text);
    if (opts.length < 2)
      return { questions: [], error: `${i + 1}-savol: kamida 2 ta variant kerak` };
    const ci = Number(q.correctIndex);
    if (!Number.isInteger(ci) || ci < 0 || ci >= opts.length)
      return { questions: [], error: `${i + 1}-savol: to'g'ri variant belgilanmagan` };

    questions.push({
      _id: new Types.ObjectId(),
      type,
      text,
      imageUrl: q.imageUrl || undefined,
      options: opts,
      correctOptionId: opts[ci]._id.toString(),
      points,
    });
  }
  return { questions };
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
  if (!Array.isArray(b.questions) || b.questions.length === 0)
    return err("Kamida bitta savol qo'shing");

  const { questions, error } = buildQuestions(b.questions);
  if (error) return err(error);

  await connectDB();
  const group = await Group.findById(b.groupId).lean().exec();
  if (!group) return notFound();
  if (me.role === "teacher" && group.teacherId.toString() !== me._id.toString())
    return forbidden();

  const durationMin = Number(b.durationMin) > 0 ? Math.min(Number(b.durationMin), 600) : 30;
  const maxViolations = Number(b.maxViolations) >= 0 ? Number(b.maxViolations) : 3;

  const test = await Test.create({
    groupId: group._id,
    authorId: me._id,
    title,
    subject: (b.subject || "").trim(),
    description: (b.description || "").trim(),
    durationMin,
    shuffleQuestions: b.shuffleQuestions !== false,
    shuffleOptions: b.shuffleOptions !== false,
    maxViolations,
    isPublic: b.isPublic === true,
    status: "draft",
    questions,
  });

  return json({ test: sTest(test.toObject(), true) });
});
