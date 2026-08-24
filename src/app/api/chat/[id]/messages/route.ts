import {
  withAuth,
  requireUser,
  json,
  err,
  notFound,
  forbidden,
} from "@/server/api";
import { connectDB } from "@/server/db";
import { Conversation, Message } from "@/server/models";
import type { MessageDoc } from "@/server/models";
import { sMessage, sConversation } from "@/server/serialize";
import { canAccessConversation, sid } from "@/server/chat";
import { emitToGroup, emitToUsers } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE = 30;
const MAX_BODY = 4000;

/** Suhbatdagi xabarlar (eng yangisidan orqaga sahifalab). */
export const GET = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    await connectDB();
    const conv = await Conversation.findById(ctx.params.id).lean().exec();
    if (!conv) return notFound();
    if (!(await canAccessConversation({ _id: me._id, role: me.role }, conv)))
      return forbidden();

    const url = new URL(req.url);
    const before = url.searchParams.get("before");
    const filter: Record<string, unknown> = { conversationId: conv._id };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const docs = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(PAGE + 1)
      .lean<(MessageDoc & { createdAt: Date })[]>()
      .exec();

    const hasMore = docs.length > PAGE;
    const page = docs.slice(0, PAGE).reverse(); // eskidan yangiga
    return json({
      messages: page.map(sMessage),
      hasMore,
    });
  }
);

/** Suhbatga xabar yuborish. */
export const POST = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    let b: { body?: string };
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }
    const body = (b.body || "").trim().slice(0, MAX_BODY);
    if (!body) return err("Xabar bo'sh bo'lishi mumkin emas");

    await connectDB();
    const conv = await Conversation.findById(ctx.params.id).exec();
    if (!conv) return notFound();
    if (!(await canAccessConversation({ _id: me._id, role: me.role }, conv)))
      return forbidden();

    const myId = sid(me._id);
    const now = new Date();
    const msg = await Message.create({
      conversationId: conv._id,
      senderId: me._id,
      body,
    });

    // Suhbat oldindan ko'rinishini yangilaymiz + yuboruvchi uchun "o'qildi".
    conv.lastMessage = { body, senderId: me._id, at: now } as never;
    conv.lastMessageAt = now;
    const mine = (conv.reads ?? []).find((r) => r.userId?.toString() === myId);
    if (mine) mine.lastReadAt = now;
    else conv.reads.push({ userId: me._id, lastReadAt: now } as never);
    await conv.save();

    const message = sMessage(msg.toObject());
    const conversation = sConversation(conv);
    const payload = { message, conversation };

    if (conv.kind === "group" && conv.groupId) {
      emitToGroup(conv.groupId.toString(), "chat:message", payload);
    } else {
      emitToUsers(
        (conv.participantIds ?? []).map((p) => p.toString()),
        "chat:message",
        payload
      );
    }

    return json({ message, conversation });
  }
);
