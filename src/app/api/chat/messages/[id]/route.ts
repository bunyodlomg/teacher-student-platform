import {
  withAuth,
  requireUser,
  json,
  notFound,
  forbidden,
} from "@/server/api";
import { connectDB } from "@/server/db";
import { Conversation, Message, Group } from "@/server/models";
import type { MessageDoc } from "@/server/models";
import { canAccessConversation, sid } from "@/server/chat";
import { emitToGroup, emitToUsers } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Xabarni o'chirish — muallif, admin, yoki guruh o'qituvchisi. */
export const DELETE = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    await connectDB();

    const msg = await Message.findById(ctx.params.id).exec();
    if (!msg) return notFound();
    const conv = await Conversation.findById(msg.conversationId).exec();
    if (!conv) return notFound();
    if (!(await canAccessConversation({ _id: me._id, role: me.role }, conv)))
      return forbidden();

    const myId = sid(me._id);
    const isAuthor = msg.senderId.toString() === myId;
    let canDelete = isAuthor || me.role === "admin";
    // guruh o'qituvchisi o'z guruhidagi istalgan xabarni o'chira oladi
    if (!canDelete && conv.kind === "group" && me.role === "teacher" && conv.groupId) {
      const group = await Group.findById(conv.groupId).lean().exec();
      if (group && group.teacherId.toString() === myId) canDelete = true;
    }
    if (!canDelete) return forbidden();

    await msg.deleteOne();

    // Oxirgi xabar ko'rinishini qayta hisoblaymiz.
    const newest = await Message.findOne({ conversationId: conv._id })
      .sort({ createdAt: -1 })
      .lean<MessageDoc & { createdAt: Date }>()
      .exec();
    if (newest) {
      const preview =
        newest.body ||
        (newest.attachments && newest.attachments.length ? "📎 Fayl" : "");
      conv.lastMessage = {
        body: preview,
        senderId: newest.senderId,
        at: newest.createdAt,
      } as never;
      conv.lastMessageAt = newest.createdAt;
    } else {
      conv.lastMessage = undefined as never;
      conv.lastMessageAt = undefined as never;
    }
    await conv.save();

    const payload = {
      conversationId: conv._id.toString(),
      messageId: ctx.params.id,
      lastMessage: conv.lastMessage
        ? {
            body: (conv.lastMessage as { body?: string }).body ?? "",
            senderId: (
              conv.lastMessage as { senderId?: { toString(): string } }
            ).senderId?.toString(),
            at: conv.lastMessageAt?.toISOString(),
          }
        : null,
      lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
    };

    if (conv.kind === "group" && conv.groupId) {
      emitToGroup(conv.groupId.toString(), "chat:message-deleted", payload);
    } else {
      emitToUsers(
        (conv.participantIds ?? []).map((p) => p.toString()),
        "chat:message-deleted",
        payload
      );
    }

    return json({ ok: true });
  }
);
