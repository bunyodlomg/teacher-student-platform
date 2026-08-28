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
import { Test } from "@/server/models";
import { notifyParentsForTest, telegramEnabled } from "@/server/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Test natijalarini bog'langan ota-onalarga Telegram orqali yuboradi. */
export const POST = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    requireRole(me, "teacher", "admin");

    if (!telegramEnabled)
      return err("Telegram bot sozlanmagan (TELEGRAM_BOT_TOKEN yo'q)", 400);

    await connectDB();
    const test = await Test.findById(ctx.params.id).exec();
    if (!test) return notFound();
    if (me.role !== "admin" && test.authorId.toString() !== me._id.toString())
      return forbidden();

    const result = await notifyParentsForTest(ctx.params.id);
    if (!result.ok) return err("Yuborib bo'lmadi", 500);
    return json(result);
  }
);
