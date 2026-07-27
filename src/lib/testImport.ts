import type { NewTestQuestion } from "@/store/data";

export interface ImportResult {
  questions: NewTestQuestion[];
  errors: string[];
}

const norm = (s: unknown) =>
  (s ?? "").toString().trim().toLowerCase().replace(/[\s'`ʻ’]/g, "");

// ustun sarlavhalarini moslashtirish (o'zbek + ingliz)
const HEADER = {
  text: ["savol", "question", "matn", "text", "q"],
  type: ["tur", "type", "turi"],
  answer: ["javob", "answer", "correct", "togri", "to'g'ri", "kalit", "key"],
  points: ["ball", "points", "point", "ochko"],
  image: ["rasm", "image", "img", "rasmurl"],
  // variant ustunlari A,B,C,D yoki variant1..
  opt: (h: string) => {
    const n = norm(h);
    if (/^[a-dа-г]$/.test(n)) return "abcd".indexOf(n) >= 0 ? "abcd".indexOf(n) : -1;
    const m = n.match(/^(variant|option|var|v)\s*([1-9])$/);
    if (m) return parseInt(m[2], 10) - 1;
    return -1;
  },
};

function matchHeader(h: string): keyof typeof HEADER | "opt" | null {
  const n = norm(h);
  for (const key of ["text", "type", "answer", "points", "image"] as const) {
    if ((HEADER[key] as string[]).some((x) => norm(x) === n)) return key;
  }
  if (HEADER.opt(h) >= 0) return "opt";
  return null;
}

function toType(v: unknown): NewTestQuestion["type"] {
  const n = norm(v);
  if (["boolean", "bool", "tf", "togrinotogri", "ha yoq", "hayoq"].includes(n))
    return "boolean";
  if (["short", "yozma", "matn", "qisqa", "text"].includes(n)) return "short";
  return "single";
}

const BOOL_TRUE = ["togri", "true", "t", "ha", "1", "toʻgʻri", "rost", "yes"];

/** SheetJS orqali o'qilgan qatorlar massivini savollarga aylantiradi. */
export function rowsToQuestions(rows: unknown[][]): ImportResult {
  const errors: string[] = [];
  if (!rows.length) return { questions: [], errors: ["Fayl bo'sh"] };

  // sarlavha qatorini topamiz (birinchi to'ldirilgan qator)
  let headerIdx = rows.findIndex((r) =>
    r.some((c) => (c ?? "").toString().trim() !== "")
  );
  if (headerIdx < 0) return { questions: [], errors: ["Fayl bo'sh"] };

  const header = rows[headerIdx].map((c) => (c ?? "").toString());
  const col = { text: -1, type: -1, answer: -1, points: -1, image: -1 };
  const optCols: { idx: number; slot: number }[] = [];

  header.forEach((h, i) => {
    const m = matchHeader(h);
    if (m === "opt") optCols.push({ idx: i, slot: HEADER.opt(h) });
    else if (m) (col as Record<string, number>)[m] = i;
  });

  if (col.text < 0) {
    errors.push(
      "‘savol’ ustuni topilmadi. Sarlavha qatorida savol/variant ustunlari bo'lishi kerak."
    );
    return { questions: [], errors };
  }
  optCols.sort((a, b) => a.slot - b.slot);

  const questions: NewTestQuestion[] = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const text = (row[col.text] ?? "").toString().trim();
    if (!text) continue; // bo'sh qatorni o'tkazamiz
    const line = r + 1;

    const type = col.type >= 0 ? toType(row[col.type]) : "single";
    const points =
      col.points >= 0 && Number(row[col.points]) > 0
        ? Number(row[col.points])
        : 1;
    const imageUrl =
      col.image >= 0 ? (row[col.image] ?? "").toString().trim() || undefined : undefined;
    const rawAnswer = ((col.answer >= 0 ? row[col.answer] : "") ?? "")
      .toString()
      .trim();

    if (type === "short") {
      if (!rawAnswer) {
        errors.push(`${line}-qator: qisqa javob uchun ‘javob’ bo'sh`);
        continue;
      }
      questions.push({ type: "short", text, correctText: rawAnswer, points, imageUrl });
      continue;
    }

    if (type === "boolean") {
      const correctIndex = BOOL_TRUE.includes(norm(rawAnswer)) ? 0 : 1;
      questions.push({
        type: "boolean",
        text,
        options: [{ text: "To'g'ri" }, { text: "Noto'g'ri" }],
        correctIndex,
        points,
        imageUrl,
      });
      continue;
    }

    // single — variant ustunlaridan yig'amiz
    const options = optCols
      .map((c) => ({ text: (row[c.idx] ?? "").toString().trim() }))
      .filter((o) => o.text);
    if (options.length < 2) {
      errors.push(`${line}-qator: kamida 2 ta variant kerak`);
      continue;
    }

    // javobni aniqlaymiz: harf (A/B/C/D), raqam (1..n) yoki variant matni
    let correctIndex = -1;
    const a = norm(rawAnswer);
    if (/^[a-d]$/.test(a)) correctIndex = "abcd".indexOf(a);
    else if (/^[1-9]$/.test(a)) correctIndex = parseInt(a, 10) - 1;
    else correctIndex = options.findIndex((o) => norm(o.text) === a);

    if (correctIndex < 0 || correctIndex >= options.length) {
      errors.push(
        `${line}-qator: ‘javob’ (${rawAnswer || "bo'sh"}) variantlarga mos kelmadi`
      );
      continue;
    }
    questions.push({ type: "single", text, options, correctIndex, points, imageUrl });
  }

  if (!questions.length && !errors.length)
    errors.push("Hech qanday savol topilmadi");
  return { questions, errors };
}

/** Faylni (xlsx/xls/csv) o'qib savollarga aylantiradi. SheetJS dinamik yuklanadi. */
export async function parseTestFile(file: File): Promise<ImportResult> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { questions: [], errors: ["Varaq topilmadi"] };
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  return rowsToQuestions(rows as unknown[][]);
}

/**
 * Namuna Excel (.xlsx) — 1-qator to'ldirilgan misol, keyin 29 ta tayyor bo'sh
 * qator (jami 30 ta savol). Foydalanuvchi to'ldirib, shu faylni import qiladi.
 */
export async function templateWorkbookBlob(): Promise<Blob> {
  const XLSX = await import("xlsx");

  const header = ["savol", "A", "B", "C", "D", "javob"];
  // 1-qator — namuna (to'g'ri javob A/B/C/D harfi bilan)
  const example = [
    "O'zbekiston poytaxti qaysi shahar?",
    "Toshkent",
    "Samarqand",
    "Buxoro",
    "Xiva",
    "A",
  ];
  const emptyRows = Array.from({ length: 29 }, () => ["", "", "", "", "", ""]);
  const aoa = [header, example, ...emptyRows];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 48 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Savollar");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
