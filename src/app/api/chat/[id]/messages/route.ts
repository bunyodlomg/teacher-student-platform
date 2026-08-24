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
import type { Attachment } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE = 30;
const MAX_BODY = 4000;

/** Faqat faylli xabar uchun ro'yxatda ko'rinadigan qisqa yorliq. */
function previewFor(body: string, attachments: Attachment[]): string {
  if (body) return body;
  if (attachments.length === 0) return "";
  const first = attachments[0];
  const label =
    first.kind === "image"
      ? "🖼 Rasm"
      : first.kind === "video"
      ? "🎬 Video"
      : first.kind === "audio"
      ? "🎧 Audio"
      : "📎 Fayl";
  return attachments.length > 1 ? `${label} +${attachments.length - 1}` : label;
}

/** Kiruvchi attachment'larni xavfsiz ko'rinishga keltiradi. */
function cleanAttachments(input: unknown): Attachment[] {
  if (!Array.isArray(input)) return [];
  const kinds = ["image", "video", "audio", "pdf", "doc", "slides", "link"];
  return input
    .filter(
      (a): a is Attachment =>
        !!a && typeof a === "object" && kinds.includes((a as Attachment).kind)
    )
    .slice(0, 10)
    .map((a) => ({
      id: String(a.id ?? ""),
      kind: a.kind,
      name: String(a.name ?? "fayl"),
      meta: a.meta ? String(a.meta) : undefined,
      url: a.url ? String(a.url) : undefined,
    }));
}

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
    let b: { body?: string; attachments?: unknown };
    try {
      b = await req.json();
    } catch {
      return err("Noto'g'ri so'rov");
    }
    const body = (b.body || "").trim().slice(0, MAX_BODY);
    const attachments = cleanAttachments(b.attachments);
    if (!body && attachments.length === 0)
      return err("Xabar bo'sh bo'lishi mumkin emas");

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
      attachments,
    });

    // Suhbat oldindan ko'rinishini yangilaymiz + yuboruvchi uchun "o'qildi".
    conv.lastMessage = {
      body: previewFor(body, attachments),
      senderId: me._id,
      at: now,
    } as never;
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
