import { withAuth, requireUser, json } from "@/server/api";
import { loadStateFor } from "@/server/scope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withAuth(async () => {
  const me = await requireUser();
  const state = await loadStateFor({ id: me._id.toString(), role: me.role });
  return json(state);
});
