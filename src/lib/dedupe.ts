/**
 * Takroriy urinishlarni birlashtirish — bir o'quvchi testni bir necha marta
 * ishlagan bo'lsa, faqat ENG YAXSHI natijasi qoladi.
 *
 * Mehmon (loginsiz) ishtirokchida barqaror identifikator yo'q, shu sabab
 * ikki belgidan foydalanamiz:
 *  1. telefon — oxirgi 9 raqami ("+998 91 329 70 77" va "91 329 7077" bir xil);
 *  2. ism + sinf — so'zlar tartibi va katta-kichik harf hisobga olinmaydi
 *     ("Tojimatov murodilla" = "murodilla tojimatov").
 * Ikkalasi ham bitta ishtirokchini ko'rsatsa, urinishlar birlashtiriladi.
 */

import type { ExportRow } from "@/lib/testExport";
import { normalizeGrade } from "@/lib/grade";

/** Ismni taqqoslash uchun: harflar kichik, so'zlar alifbo tartibida. */
function nameKey(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[‘’'`ʻʼ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/** Telefonning oxirgi 9 raqami — kod va formatdan qat'i nazar bir xil. */
function phoneKey(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

/** Oddiy union-find — bir nechta belgini bitta ishtirokchiga bog'lash uchun. */
class Union {
  private parent = new Map<string, string>();

  find(k: string): string {
    const p = this.parent.get(k);
    if (p === undefined) {
      this.parent.set(k, k);
      return k;
    }
    if (p === k) return k;
    const root = this.find(p);
    this.parent.set(k, root);
    return root;
  }

  join(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/** Guruhdagi eng ko'p uchragan bo'sh bo'lmagan sinf. */
function dominantGrade(rows: ExportRow[]): string {
  const count = new Map<string, number>();
  for (const r of rows) {
    const g = normalizeGrade(r.grade);
    if (g) count.set(g, (count.get(g) ?? 0) + 1);
  }
  let best = "";
  let n = 0;
  for (const [g, c] of count) {
    if (c > n) {
      best = g;
      n = c;
    }
  }
  return best;
}

/**
 * Har ishtirokchidan bitta — eng yuqori ball (teng bo'lsa: tezroq ishlagani)
 * qoldiriladi. Sinf sifatida guruhdagi eng ko'p ko'rsatilgan sinf olinadi.
 */
export function bestAttemptRows(rows: ExportRow[]): {
  rows: ExportRow[];
  removed: number;
} {
  const u = new Union();
  const rowKey = rows.map((r, i) => {
    const own = `i:${i}`;
    u.find(own);
    const ph = phoneKey(r.phone);
    if (ph.length >= 7) u.join(own, `p:${ph}`);
    const nk = nameKey(r.name);
    if (nk) u.join(own, `n:${nk}|${normalizeGrade(r.grade)}`);
    return own;
  });

  const groups = new Map<string, ExportRow[]>();
  rows.forEach((r, i) => {
    const root = u.find(rowKey[i]);
    const list = groups.get(root);
    if (list) list.push(r);
    else groups.set(root, [r]);
  });

  const out: ExportRow[] = [];
  let removed = 0;
  for (const list of groups.values()) {
    removed += list.length - 1;
    const best = [...list].sort((a, b) => {
      if (b.attempt.score !== a.attempt.score)
        return b.attempt.score - a.attempt.score;
      // teng ball — tezroq topshirgani ustun
      return spent(a.attempt) - spent(b.attempt);
    })[0];
    const grade = dominantGrade(list);
    out.push(grade && grade !== normalizeGrade(best.grade) ? { ...best, grade } : best);
  }

  out.sort((a, b) => b.attempt.score - a.attempt.score);
  return { rows: out, removed };
}

/** Testga sarflangan vaqt (ms) — teng ballarni ajratish uchun. */
function spent(a: ExportRow["attempt"]): number {
  if (!a.startedAt || !a.submittedAt) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime();
  return ms > 0 ? ms : Number.MAX_SAFE_INTEGER;
}
