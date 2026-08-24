import { withAuth, requireUser, json, err, forbidden } from "@/server/api";
import { connectDB } from "@/server/db";
import { User } from "@/server/models";
import {
  canDirectMessage,
  ensureDirectConversation,
  unreadCount,
  sid,
} from "@/server/chat";
import { sConversation } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Berilgan foydalanuvchi bilan shaxsiy suhbatni ochadi/yaratadi. */
export const POST = withAuth(async (req: Request) => {
  const me = await requireUser();
  let b: { userId?: string };
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }
  const otherId = (b.userId || "").trim();
  if (!otherId) return err("Foydalanuvchi tanlanmagan");

  await connectDB();
  const other = await User.findById(otherId).lean().exec();
  if (!other) return err("Foydalanuvchi topilmadi", 404);

  const allowed = await canDirectMessage(
    { _id: me._id, role: me.role },
    { _id: other._id, role: other.role }
  );
  if (!allowed) return forbidden();

  const conv = await ensureDirectConversation(sid(me._id), otherId);
  const unread = await unreadCount(conv, sid(me._id));
  return json({ conversation: sConversation(conv, unread) });
});
