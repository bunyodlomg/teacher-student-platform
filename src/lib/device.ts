/**
 * Qurilma identifikatori — loginsiz (mehmon) kirishlarni ajratish uchun.
 *
 * Brauzer kompyuterning OS foydalanuvchi nomini bermaydi, shu sabab har bir
 * qurilmaga bir marta tasodifiy ID beriladi va server unga guruh doirasida
 * "Kompyuter-1", "Kompyuter-2" ... yorlig'ini biriktiradi.
 */
const DEVICE_KEY = "cl_device_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `d-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = window.localStorage.getItem(DEVICE_KEY);
    if (saved) return saved;
    const fresh = randomId();
    window.localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage o'chirilgan bo'lsa — sessiya davomida saqlanadi
    return randomId();
  }
}

export interface GuestSession {
  name: string;
  grade?: string;
  label: string;
  token: string;
}

const sessionKey = (scope: string, id: string) => `cl_material_${scope}_${id}`;

export function loadGuestSession(
  scope: string,
  id: string
): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(sessionKey(scope, id));
    return raw ? (JSON.parse(raw) as GuestSession) : null;
  } catch {
    return null;
  }
}

export function saveGuestSession(
  scope: string,
  id: string,
  s: GuestSession
): void {
  try {
    window.localStorage.setItem(sessionKey(scope, id), JSON.stringify(s));
  } catch {
    /* ixtiyoriy qulaylik — saqlanmasa ham ishlaydi */
  }
}
