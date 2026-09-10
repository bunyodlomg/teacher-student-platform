import { json, err, notFound } from "@/server/api";
import { connectDB } from "@/server/db";
import {
  isScope,
  loadPublicTarget,
  logGuestEvent,
  registerGuest,
  sPublicMaterial,
  withFiles,
} from "@/server/materials";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Body {
  deviceId?: string;
  name?: string;
  grade?: string;
}

/**
 * Mehmonni ro'yxatga oladi va materiallarni qaytaradi.
 * Ism majburiy; qurilmaga guruh ichida "Kompyuter-N" yorlig'i biriktiriladi,
 * shu sabab kirish hech qachon to'liq anonim bo'lmaydi.
 */
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

  const name = (b.name || "").trim();
  const grade = (b.grade || "").trim();
  const deviceId = (b.deviceId || "").trim().slice(0, 64);
  if (name.length < 3) return err("Ism-familiyani to'liq kiriting");
  if (!deviceId) return err("Qurilma aniqlanmadi");

  await connectDB();
  const target = await loadPublicTarget(scope, id);
  if (!target) return err("Bu material ochiq emas yoki topilmadi", 404);

  const files = withFiles(target.posts);
  if (files.length === 0) return err("Bu yerda hali material yo'q", 404);

  const guest = await registerGuest(target.group._id, deviceId, name, grade);
  await logGuestEvent(
    guest,
    "open",
    scope === "p" ? id : undefined,
    scope === "p" ? target.post!.title : ""
  );

  return json({
    guest: { label: guest.label, name: guest.name },
    token: guest.token,
    materials: files.map(sPublicMaterial),
  });
};
