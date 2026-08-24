import {
  withAuth,
  requireUser,
  json,
  notFound,
  forbidden,
} from "@/server/api";
import { connectDB } from "@/server/db";
import { Conversation } from "@/server/models";
import { canAccessConversation, sid } from "@/server/chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Suhbatni o'qilgan deb belgilaydi (o'qilmagan sonini nolga tushiradi). */
export const POST = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    await connectDB();
    const conv = await Conversation.findById(ctx.params.id).exec();
    if (!conv) return notFound();
    if (!(await canAccessConversation({ _id: me._id, role: me.role }, conv)))
      return forbidden();

    const myId = sid(me._id);
    const now = new Date();
    const mine = (conv.reads ?? []).find((r) => r.userId?.toString() === myId);
    if (mine) mine.lastReadAt = now;
    else conv.reads.push({ userId: me._id, lastReadAt: now } as never);
    await conv.save();

    return json({ ok: true });
  }
);
