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
import { Test, TestAttempt, Group } from "@/server/models";
import { sTest } from "@/server/serialize";
import { notifyMany } from "@/server/notify";
import { emitToGroup } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadOwned(id: string, meId: string, role: string) {
  await connectDB();
  const test = await Test.findById(id).exec();
  if (!test) return { error: notFound() as Response };
  if (role !== "admin" && test.authorId.toString() !== meId)
    return { error: forbidden() as Response };
  return { test };
}

export const PATCH = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    requireRole(me, "teacher", "admin");

    let b: Record<string, unknown>;
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }

    const { test, error } = await loadOwned(
      ctx.params.id,
      me._id.toString(),
      me.role
    );
    if (error) return error;
    if (!test) return notFound();

    // Status o'zgartirish (ochish / yopish / qoralamaga qaytarish)
    if (typeof b.status === "string") {
      const next = b.status;
      if (!["draft", "open", "closed"].includes(next))
        return err("Noto'g'ri holat");
      const wasOpen = test.status === "open";
      test.status = next as typeof test.status;
      if (next === "open" && !test.opensAt) test.opensAt = new Date();
      if (next === "closed") test.closesAt = new Date();
      await test.save();

      const dto = sTest(test.toObject(), true);
      emitToGroup(test.groupId.toString(), "test:updated", {
        ...dto,
        questions: [],
      });

      // Yangi ochilganda o'quvchilarni xabardor qilamiz
      if (next === "open" && !wasOpen) {
        const group = await Group.findById(test.groupId).lean().exec();
        if (group) {
          await notifyMany(
            group.studentIds.map((s) => s.toString()),
            () => ({
              type: "assignment",
              title: `${group.name}da yangi test`,
              body: test.title,
              groupId: group._id.toString(),
              link: `/student/tests/${test._id.toString()}`,
            })
          );
        }
      }
      return json({ test: dto });
    }

    // Metadata / savol tahriri — faqat qoralama holatida
    if (test.status !== "draft")
      return err("Faqat qoralama testni tahrirlash mumkin");

    if (typeof b.title === "string") test.title = b.title.trim() || test.title;
    if (typeof b.subject === "string") test.subject = b.subject.trim();
    if (typeof b.description === "string") test.description = b.description.trim();
    if (Number(b.durationMin) > 0)
      test.durationMin = Math.min(Number(b.durationMin), 600);
    if (typeof b.shuffleQuestions === "boolean")
      test.shuffleQuestions = b.shuffleQuestions;
    if (typeof b.shuffleOptions === "boolean")
      test.shuffleOptions = b.shuffleOptions;
    if (Number(b.maxViolations) >= 0) test.maxViolations = Number(b.maxViolations);

    await test.save();
    return json({ test: sTest(test.toObject(), true) });
  }
);

export const DELETE = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    requireRole(me, "teacher", "admin");

    const { test, error } = await loadOwned(
      ctx.params.id,
      me._id.toString(),
      me.role
    );
    if (error) return error;
    if (!test) return notFound();

    const groupId = test.groupId.toString();
    await TestAttempt.deleteMany({ testId: test._id }).exec();
    await test.deleteOne();

    emitToGroup(groupId, "test:deleted", { id: ctx.params.id });
    return json({ id: ctx.params.id });
  }
);
