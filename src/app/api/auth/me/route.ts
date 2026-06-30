import { getSessionUser, json, unauthorized } from "@/server/api";
import { sUser } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return json({ user: sUser(user) });
}
