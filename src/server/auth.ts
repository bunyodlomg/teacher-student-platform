import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { User, UserDoc } from "./models";

const SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";
export const COOKIE_NAME = "cl_token";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 kun

export interface TokenPayload {
  uid: string;
  role: string;
}

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as TokenPayload;
    if (decoded?.uid) return { uid: decoded.uid, role: decoded.role };
    return null;
  } catch {
    return null;
  }
}

/**
 * So'rov haqiqatan HTTPS orqali kelganini aniqlaydi (Nginx `X-Forwarded-Proto`).
 * `Secure` cookie faqat HTTPS'da saqlanadi — SSL o'rnatilmagan HTTP saytda
 * bu bayroq cookie'ni yo'qotib, "login formga qaytish" muammosini keltiradi.
 */
export function isSecureRequest(req: {
  headers: { get(name: string): string | null };
}): boolean {
  const proto = (req.headers.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return proto === "https";
}

/** Cookie options for the auth token. `secure` — so'rov protokoliga qarab. */
export function tokenCookie(token: string, secure = false) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export function clearCookie(secure = false) {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 0,
  };
}

async function findUserById(id: string): Promise<UserDoc | null> {
  await connectDB();
  return User.findById(id).lean<UserDoc>().exec();
}

/** Reads the auth cookie (App Router) and returns the current user, or null. */
export async function getSessionUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return findUserById(payload.uid);
}

/** Verify a raw token string (used by the socket server). */
export async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return findUserById(payload.uid);
}
