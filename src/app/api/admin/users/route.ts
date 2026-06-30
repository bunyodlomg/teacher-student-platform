import { withAuth, requireUser, requireRole, json, err } from "@/server/api";
import { connectDB } from "@/server/db";
import { User } from "@/server/models";
import { hashPassword } from "@/server/auth";
import { sUser } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HUES = [
  "from-rose-500 to-orange-400",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-yellow-400",
  "from-fuchsia-500 to-pink-400",
  "from-indigo-500 to-blue-400",
  "from-violet-500 to-indigo-500",
];

interface Body {
  name?: string;
  email?: string;
  role?: "admin" | "teacher" | "student";
  headline?: string;
  password?: string;
}

export const POST = withAuth(async (req: Request) => {
  const me = await requireUser();
  requireRole(me, "admin");

  let b: Body;
  try {
    b = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }

  const name = (b.name || "").trim();
  const email = (b.email || "").trim().toLowerCase();
  const role = b.role === "admin" || b.role === "teacher" ? b.role : "student";
  if (!name || !email) return err("Ism va login majburiy");

  await connectDB();
  const exists = await User.findOne({ email }).lean().exec();
  if (exists) return err("Bu login allaqachon mavjud", 409);

  const count = await User.countDocuments().exec();
  const password = (b.password || "").trim() || "cambridge123";
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    headline: (b.headline || "").trim() || undefined,
    hue: HUES[count % HUES.length],
  });

  // Return the temporary password so the admin can share it.
  return json({ user: sUser(user.toObject()), tempPassword: password });
});
