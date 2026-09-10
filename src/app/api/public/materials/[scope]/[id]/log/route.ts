import { json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import { MaterialGuest } from "@/server/models";
import { isScope, loadPublicTarget, logGuestEvent } from "@/server/materials";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  deviceId?: string;
  token?: string;
  postId?: string;
  fileName?: string;
}

/** Mehmon faylni yuklab olganini jurnalga yozadi. */
export const POST = async (
  req: Request,
  ctx: { params: { scope: string; id: string } }
) => {
  const { scope, id } = ctx.params;
  if (!isScope(scope)) return notFound();

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }
  const deviceId = (b.deviceId || "").trim().slice(0, 64);
  const token = (b.token || "").trim();
  if (!deviceId || !token) return err("Sessiya topilmadi", 401);

  await connectDB();
  const target = await loadPublicTarget(scope, id);
  if (!target) return err("Bu material ochiq emas yoki topilmadi", 404);

  const guest = await MaterialGuest.findOne({
    groupId: target.group._id,
    deviceId,
  }).exec();
  if (!guest || guest.token !== token) return err("Sessiya topilmadi", 401);

  await logGuestEvent(
    guest,
    "download",
    (b.postId || "").trim() || undefined,
    (b.fileName || "").trim().slice(0, 200)
  );
  return json({ ok: true });
};
