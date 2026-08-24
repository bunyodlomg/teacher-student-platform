import { withAuth, requireUser, json } from "@/server/api";
import { listConversationsFor } from "@/server/chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Joriy foydalanuvchining barcha suhbatlari (guruh + shaxsiy). */
export const GET = withAuth(async () => {
  const me = await requireUser();
  const conversations = await listConversationsFor({
    _id: me._id,
    role: me.role,
  });
  return json({ conversations });
});
