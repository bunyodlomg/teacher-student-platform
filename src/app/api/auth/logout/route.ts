import { clearCookie } from "@/server/auth";
import { json } from "@/server/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(clearCookie());
  return res;
}
