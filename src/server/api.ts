import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";

export { getSessionUser };

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export const unauthorized = () => err("Avtorizatsiya talab qilinadi", 401);
export const forbidden = () => err("Ruxsat yo'q", 403);
export const notFound = () => err("Topilmadi", 404);

/** Returns the user or throws a Response (caught by withAuth). */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw unauthorized();
  return user;
}

export function requireRole(
  user: { role: string },
  ...roles: string[]
) {
  if (!roles.includes(user.role)) throw forbidden();
}

/**
 * Wraps a handler so thrown Response objects (from requireUser/requireRole)
 * become the HTTP response, and unexpected errors become 500.
 */
export function withAuth<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error("API error:", e);
      return err("Server xatosi", 500);
    }
  };
}
