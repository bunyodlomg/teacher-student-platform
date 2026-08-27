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
import { sMessage } from "@/server/serialize";
import { canAccessConversation, sid } from "@/server/chat";
import { emitToGroup, emitToUsers } from "@/server/io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Xabarga emoji reaksiyani qo'shish/olib tashlash (toggle). */
export const POST = withAuth(
  async (req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    let b: { emoji?: string };
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }
    const emoji = (b.emoji || "").trim().slice(0, 8);
    if (!emoji) return err("Emoji majburiy");

    await connectDB();
    const msg = await Message.findById(ctx.params.id).exec();
    if (!msg) return notFound();
    const conv = await Conversation.findById(msg.conversationId).exec();
    if (!conv) return notFound();
    if (!(await canAccessConversation({ _id: me._id, role: me.role }, conv)))
      return forbidden();

    const uid = sid(me._id);
    const idx = (msg.reactions ?? []).findIndex(
      (r) => r.userId.toString() === uid && r.emoji === emoji
    );
    if (idx >= 0) msg.reactions.splice(idx, 1);
    else msg.reactions.push({ userId: me._id, emoji } as never);
    await msg.save();

    const message = sMessage(msg.toObject());

    if (conv.kind === "group" && conv.groupId) {
      emitToGroup(conv.groupId.toString(), "chat:message-updated", { message });
    } else {
      emitToUsers(
        (conv.participantIds ?? []).map((p) => p.toString()),
        "chat:message-updated",
        { message }
      );
    }

    return json({ message });
  }
);
