import {
  withAuth,
  requireUser,
  json,
  notFound,
  forbidden,
} from "@/server/api";
import { connectDB } from "@/server/db";
import { Group, MaterialGuest } from "@/server/models";
import { sMaterialGuest } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Guruhning ochiq materiallariga loginsiz kirganlar jurnali (o'qituvchi/admin). */
export const GET = withAuth(
  async (_req: Request, ctx: { params: { id: string } }) => {
    const me = await requireUser();
    if (me.role === "student") return forbidden();

    await connectDB();
    const group = await Group.findById(ctx.params.id, { teacherId: 1 })
      .lean()
      .exec();
    if (!group) return notFound();
    if (me.role !== "admin" && group.teacherId.toString() !== me._id.toString())
      return forbidden();

    const guests = await MaterialGuest.find({ groupId: group._id })
      .sort({ lastSeenAt: -1 })
      .lean()
      .exec();

    return json({ guests: guests.map(sMaterialGuest) });
  }
);
