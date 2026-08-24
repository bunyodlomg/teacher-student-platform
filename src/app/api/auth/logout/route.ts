import { NextRequest } from "next/server";
import { clearCookie, isSecureRequest } from "@/server/auth";
import { json } from "@/server/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const res = json({ ok: true });
  res.cookies.set(clearCookie(isSecureRequest(req)));
  return res;
}
