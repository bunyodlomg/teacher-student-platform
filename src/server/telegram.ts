/**
 * Telegram bot integratsiyasi — ota-onalarga test natijalarini yuborish.
 *
 * Ulash oqimi (telefon orqali):
 *   1. Ota-ona botni ochib /start bosadi.
 *   2. Bot "📱 Raqamni ulashish" tugmasini yuboradi (request_contact).
 *   3. Ota-ona kontaktini yuboradi → biz chatId ↔ telefon bog'lanishini saqlaymiz.
 *   4. O'qituvchi natijalar sahifasida "Ota-onaga yuborish" tugmasini bosganda,
 *      har bir ishtirokchining telefoni bo'yicha bog'langan chatlarga natija ketadi.
 *
 * Long-polling (webhook emas) — VPS'da qo'shimcha HTTPS sozlashsiz ishlaydi.
 * Token yo'q bo'lsa bot jim o'chiq turadi (ilova baribir normal ishlaydi).
 */
import { connectDB } from "./db";
import { TelegramLink, Test, TestAttempt, Group, User } from "./models";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : "";

const UZ_MONTHS_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyn",
  "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek",
];
const pad2 = (n: number) => String(n).padStart(2, "0");

function fmtDateTime(d: Date): string {
  return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]}, ${d.getHours()}:${pad2(
    d.getMinutes()
  )}`;
}

function fmtDuration(a?: Date | null, b?: Date | null): string {
  if (!a || !b) return "—";
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${pad2(s)}`;
}

/** Telefonni faqat raqamlarga keltirib, oxirgi 9 raqamini kalit qiladi. */
export function phoneKeyOf(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > 9 ? digits.slice(-9) : digits;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─────────────────────────── Telegram API ───────────────────────────

async function tg(method: string, body: Record<string, unknown>): Promise<any> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.error("[telegram] tg() xato:", (e as Error).message);
    return null;
  }
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  extra: Record<string, unknown> = {}
): Promise<boolean> {
  const r = await tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
  return !!r?.ok;
}

// ─────────────────────────── Ulash (link) ───────────────────────────

async function saveLink(msg: any, phoneRaw: string) {
  const chatId = String(msg.chat.id);
  const key = phoneKeyOf(phoneRaw);
  if (!key) return false;
  const from = msg.from || {};
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  await TelegramLink.findOneAndUpdate(
    { chatId },
    {
      chatId,
      phoneRaw,
      phoneKey: key,
      name,
      username: from.username || "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();
  return true;
}

const contactKeyboard = {
  keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

async function handleUpdate(update: any) {
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;

  // Kontakt yuborildi → bog'laymiz
  if (msg.contact?.phone_number) {
    const ok = await saveLink(msg, msg.contact.phone_number);
    await sendMessage(
      chatId,
      ok
        ? "✅ <b>Bog'landingiz!</b>\nEndi farzandingiz test topshirganda, o'qituvchi natijani shu yerga yuboradi."
        : "❌ Telefon raqamini o'qib bo'lmadi. Qayta urinib ko'ring.",
      { reply_markup: { remove_keyboard: true } }
    );
    return;
  }

  const text = (msg.text || "").trim();

  if (text === "/start" || text === "/ulash") {
    await sendMessage(
      chatId,
      "👋 <b>Assalomu alaykum!</b>\n\nBu bot orqali farzandingizning test natijalarini olasiz.\n\nUlanish uchun pastdagi <b>«📱 Raqamni ulashish»</b> tugmasini bosing — bu raqam test topshirilganda kiritilgan raqam bilan bir xil bo'lishi kerak.",
      { reply_markup: contactKeyboard }
    );
    return;
  }

  // Raqamni matn ko'rinishida yuborsa ham qabul qilamiz
  if (/\d{7,}/.test(text)) {
    const ok = await saveLink(msg, text);
    await sendMessage(
      chatId,
      ok
        ? "✅ Raqamingiz bog'landi. Test natijalari shu yerga keladi."
        : "❌ Raqamni tushunmadim.",
      ok ? { reply_markup: { remove_keyboard: true } } : {}
    );
    return;
  }

  await sendMessage(
    chatId,
    "Ulanish uchun «📱 Raqamni ulashish» tugmasini bosing yoki /start yozing.",
    { reply_markup: contactKeyboard }
  );
}

// ─────────────────────────── Long polling ───────────────────────────

let polling = false;

export function startTelegramBot() {
  if (!TOKEN) {
    console.log("> Telegram bot: TELEGRAM_BOT_TOKEN yo'q — bot o'chiq");
    return;
  }
  if (polling) return;
  polling = true;
  console.log("> Telegram bot ishga tushdi (long-polling)");
  void pollLoop();
}

async function pollLoop() {
  let offset = 0;
  // Eski, to'planib qolgan update'larni tashlab yuboramiz
  const first = await tg("getUpdates", { timeout: 0, offset: -1 });
  if (first?.ok && first.result?.length) {
    offset = first.result[first.result.length - 1].update_id + 1;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await tg("getUpdates", { timeout: 30, offset });
    if (!data?.ok) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    for (const update of data.result as any[]) {
      offset = update.update_id + 1;
      try {
        await handleUpdate(update);
      } catch (e) {
        console.error("[telegram] update xato:", (e as Error).message);
      }
    }
  }
}

// ─────────────────────── Natijalarni yuborish ───────────────────────

export interface NotifyResult {
  ok: boolean;
  sent: number; // yuborilgan xabarlar soni
  participants: number; // yakunlangan urinishlar
  matched: number; // ota-onasi bog'langan ishtirokchilar
  noPhone: number; // telefoni yo'q ishtirokchilar
  noLink: number; // telefoni bor, lekin ota-ona botga ulanmagan
}

function statusLabel(s: string): string {
  return s === "in_progress"
    ? "Ishlamoqda"
    : s === "auto_submitted"
    ? "Vaqt tugadi"
    : "Topshirilgan";
}

/**
 * Test bo'yicha yakunlangan barcha urinishlarni bog'langan ota-onalarga
 * yuboradi. Har ishtirokchining telefoni bo'yicha moslashtiradi.
 */
export async function notifyParentsForTest(testId: string): Promise<NotifyResult> {
  const empty: NotifyResult = {
    ok: false,
    sent: 0,
    participants: 0,
    matched: 0,
    noPhone: 0,
    noLink: 0,
  };
  if (!TOKEN) return empty;

  await connectDB();
  const test = await Test.findById(testId).lean().exec();
  if (!test) return empty;
  const group = test.groupId
    ? await Group.findById(test.groupId).lean().exec()
    : null;
  const groupName = group?.name || "—";

  const attempts = await TestAttempt.find({
    testId: test._id,
    status: { $in: ["submitted", "auto_submitted"] },
  })
    .lean()
    .exec();

  const res: NotifyResult = { ...empty, ok: true, participants: attempts.length };

  for (const a of attempts) {
    // Ishtirokchi ismi va telefoni
    let name = a.guest?.name || "";
    let phone = a.guest?.phone || "";
    if (!a.isGuest) {
      const u = await User.findById(a.studentId).lean().exec();
      name = u?.name || name || "O'quvchi";
    }
    if (!phone) {
      res.noPhone++;
      continue;
    }

    const key = phoneKeyOf(phone);
    const links = await TelegramLink.find({ phoneKey: key }).lean().exec();
    if (!links.length) {
      res.noLink++;
      continue;
    }
    res.matched++;

    const pct = a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0;
    const when = a.submittedAt ? fmtDateTime(new Date(a.submittedAt)) : "—";
    const dur = fmtDuration(a.startedAt, a.submittedAt);

    const text =
      `🎓 <b>${esc(name || "O'quvchi")}</b> testni yakunladi\n\n` +
      `📝 <b>${esc(test.title)}</b>\n` +
      `📚 Guruh: ${esc(groupName)}\n` +
      `✅ To'g'ri: <b>${a.correctCount}/${a.totalCount}</b>\n` +
      `⭐ Ball: <b>${a.score}/${a.maxScore}</b>\n` +
      `📊 Foiz: <b>${pct}%</b>\n` +
      `⏱ Vaqt: ${dur}\n` +
      (a.violations ? `⚠️ Qoida buzish: ${a.violations}\n` : "") +
      `📅 ${when} · ${statusLabel(a.status)}`;

    for (const link of links) {
      const ok = await sendMessage(link.chatId, text);
      if (ok) res.sent++;
    }
  }

  return res;
}

export const telegramEnabled = !!TOKEN;
