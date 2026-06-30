import { withAuth, requireUser, getSessionUser, json, err, unauthorized } from "@/server/api";
import { connectDB } from "@/server/db";
import { User } from "@/server/models";
import { sUser } from "@/server/serialize";
import { hashPassword, verifyPassword } from "@/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return json({ user: sUser(user) });
}

interface Body {
  name?: string;
  headline?: string;
  hue?: string;
  avatarUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

/** Update the signed-in user's own profile (name, headline, avatar, password). */
export const PATCH = withAuth(async (req: Request) => {
  const me = await requireUser();

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }

  await connectDB();
  const user = await User.findById(me._id).exec();
  if (!user) return err("Foydalanuvchi topilmadi", 404);

  if (typeof b.name === "string") {
    const n = b.name.trim();
    if (!n) return err("Ism bo'sh bo'lmasligi kerak");
    user.name = n;
  }
  if (typeof b.headline === "string") user.headline = b.headline.trim();
  if (typeof b.hue === "string" && b.hue) user.hue = b.hue;
  if (typeof b.avatarUrl === "string") user.avatarUrl = b.avatarUrl || undefined;

  // password change (optional) — requires the current password
  if (b.newPassword) {
    if (b.newPassword.length < 6)
      return err("Yangi parol kamida 6 belgidan iborat bo'lsin");
    const ok = await verifyPassword(b.currentPassword || "", user.passwordHash);
    if (!ok) return err("Joriy parol noto'g'ri");
    user.passwordHash = await hashPassword(b.newPassword);
  }

  await user.save();
  return json({ user: sUser(user.toObject()) });
});
