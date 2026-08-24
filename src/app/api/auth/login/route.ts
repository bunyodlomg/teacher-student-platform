import { NextRequest } from "next/server";
import { connectDB } from "@/server/db";
import { User } from "@/server/models";
import {
  verifyPassword,
  signToken,
  tokenCookie,
  isSecureRequest,
} from "@/server/auth";
import { sUser } from "@/server/serialize";
import { json, err } from "@/server/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return err("Noto'g'ri so'rov");
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) return err("Login va parolni kiriting");

  await connectDB();
  const user = await User.findOne({ email }).lean().exec();
  if (!user) return err("Login yoki parol noto'g'ri", 401);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return err("Login yoki parol noto'g'ri", 401);

  const token = signToken({ uid: user._id.toString(), role: user.role });
  const res = json({ user: sUser(user) });
  res.cookies.set(tokenCookie(token, isSecureRequest(req)));
  return res;
}
