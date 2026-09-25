/**
 * Sinf ("8-A") bilan ishlash — mehmon o'quvchi qo'lda yozgan matnni bir
 * ko'rinishga keltiradi. Klient (forma) va server (start route) hamda Excel
 * eksporti shu yerdan foydalanadi, shunda natijalar sinflarga to'g'ri bo'linadi.
 */

/** Kirill sinf harflarini lotinga o'tkazish (8-А → 8-A). */
const CYR_LETTER: Record<string, string> = {
  А: "A",
  Б: "B",
  В: "V",
  Г: "G",
  Д: "D",
  Е: "E",
  Ж: "J",
  З: "Z",
  И: "I",
  Й: "Y",
  К: "K",
  Л: "L",
  М: "M",
  Н: "N",
  О: "O",
  П: "P",
  Р: "R",
  С: "S",
  Т: "T",
  У: "U",
  Ф: "F",
  Х: "X",
  Ц: "S",
  Ч: "C",
  Ш: "S",
  Э: "E",
  Ю: "U",
  Я: "Y",
};

export const NO_GRADE_LABEL = "Sinfi ko'rsatilmagan";

/**
 * Sinfni yagona ko'rinishga keltiradi:
 * "8a", "8 A", "8-а", "8-A sinf" → "8-A"; "8" → "8-sinf".
 * Tanib bo'lmasa — bosh harflarga keltirilgan asl matn qaytadi.
 */
export function normalizeGrade(raw: string): string {
  const cleaned = (raw || "")
    .trim()
    .toUpperCase()
    .replace(/[«»".,`]/g, " ")
    .replace(/\b(SINF|SINFI|KLASS|КЛАСС|CLASS|GRADE)\b/g, " ")
    .replace(/[-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  const m = cleaned.match(/^(\d{1,2})\s*([A-ZА-ЯЎҚҒҲ])?/);
  if (!m) return cleaned;

  const num = String(Number(m[1]));
  const letterRaw = m[2] ?? "";
  if (!letterRaw) return `${num}-sinf`;
  return `${num}-${CYR_LETTER[letterRaw] ?? letterRaw}`;
}

/** Sinf raqam bilan boshlanadimi — forma va server tekshiruvi uchun. */
export function isGradeValid(raw: string): boolean {
  const g = normalizeGrade(raw);
  const m = g.match(/^(\d{1,2})-/);
  if (!m) return false;
  const n = Number(m[1]);
  return n >= 1 && n <= 11;
}

/** Sinflarni tabiiy tartibda saralash: 5-A, 5-B, 8-A, 9-G, so'ng noma'lum. */
export function gradeSortKey(label: string): [number, number, string] {
  if (label === NO_GRADE_LABEL) return [9999, 9999, label];
  const m = label.match(/^(\d{1,2})-(.*)$/);
  if (!m) return [9998, 0, label];
  const suffix = m[2];
  const letter = suffix === "sinf" ? "" : suffix;
  return [Number(m[1]), letter ? letter.charCodeAt(0) : -1, label];
}
