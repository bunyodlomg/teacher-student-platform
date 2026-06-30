import { withAuth, requireUser, json } from "@/server/api";
import { connectDB } from "@/server/db";
import { Notification } from "@/server/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withAuth(async (req: Request) => {
  const me = await requireUser();
  let b: { id?: string } = {};
  try {
    b = await req.json();
  } catch {
    // empty body → mark all
  }

  await connectDB();
  if (b.id) {
    await Notification.updateOne(
      { _id: b.id, userId: me._id },
      { $set: { read: true } }
    ).exec();
  } else {
    await Notification.updateMany(
      { userId: me._id, read: false },
      { $set: { read: true } }
    ).exec();
  }
  return json({ ok: true });
});
