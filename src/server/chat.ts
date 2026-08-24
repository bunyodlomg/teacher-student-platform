import type { Types } from "mongoose";
import { connectDB } from "./db";
import { Conversation, Group, Message } from "./models";
import type { ConversationDoc } from "./models";
import { sConversation } from "./serialize";
import type { ChatConversation } from "@/lib/types";

export interface Me {
  _id: Types.ObjectId | string;
  role: string;
}

const sid = (v: Types.ObjectId | string): string =>
  typeof v === "string" ? v : v.toString();

/** direct-suhbat uchun barqaror dedupe kaliti (a/b tartibidan qat'i nazar bir xil). */
export function directKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Foydalanuvchi a'zo bo'lgan guruh id'lari. */
export async function userGroupIds(me: Me): Promise<string[]> {
  const uid = sid(me._id);
  let groups: { _id: Types.ObjectId }[];
  if (me.role === "admin") {
    groups = await Group.find({}, { _id: 1 }).lean().exec();
  } else if (me.role === "teacher") {
    groups = await Group.find({ teacherId: uid }, { _id: 1 }).lean().exec();
  } else {
    groups = await Group.find({ studentIds: uid }, { _id: 1 }).lean().exec();
  }
  return groups.map((g) => g._id.toString());
}

/** Ikki kishi kamida bitta umumiy guruhda o'qituvchi–o'quvchi bo'lib bog'langanmi? */
async function shareTeacherStudentGroup(
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const g = await Group.exists({ teacherId, studentIds: studentId });
  return !!g;
}

/**
 * Joriy foydalanuvchi berilgan foydalanuvchiga shaxsiy xabar yoza oladimi?
 * - admin → hammaga (va hamma adminga)
 * - o'qituvchi ↔ o'z guruhidagi o'quvchi
 */
export async function canDirectMessage(
  me: Me,
  other: { _id: Types.ObjectId | string; role: string }
): Promise<boolean> {
  const myId = sid(me._id);
  const otherId = sid(other._id);
  if (myId === otherId) return false;
  if (me.role === "admin" || other.role === "admin") return true;
  if (me.role === "teacher" && other.role === "student")
    return shareTeacherStudentGroup(myId, otherId);
  if (me.role === "student" && other.role === "teacher")
    return shareTeacherStudentGroup(otherId, myId);
  return false;
}

/** Foydalanuvchi shu suhbatni ko'ra oladimi? */
export async function canAccessConversation(
  me: Me,
  conv: Pick<ConversationDoc, "kind" | "groupId" | "participantIds">
): Promise<boolean> {
  const myId = sid(me._id);
  if (conv.kind === "direct") {
    return (conv.participantIds ?? []).some((p) => p.toString() === myId);
  }
  // group
  if (!conv.groupId) return false;
  if (me.role === "admin") return true;
  const group = await Group.findById(conv.groupId).lean().exec();
  if (!group) return false;
  if (me.role === "teacher") return group.teacherId.toString() === myId;
  return (group.studentIds ?? []).some((s) => s.toString() === myId);
}

/** Guruh suhbatini mavjud qiladi (yo'q bo'lsa yaratadi). */
export async function ensureGroupConversation(
  groupId: string
): Promise<ConversationDoc> {
  await connectDB();
  const conv = await Conversation.findOneAndUpdate(
    { kind: "group", groupId },
    { $setOnInsert: { kind: "group", groupId, reads: [] } },
    { upsert: true, new: true }
  ).exec();
  return conv as ConversationDoc;
}

/** Ikki kishilik shaxsiy suhbatni mavjud qiladi (yo'q bo'lsa yaratadi). */
export async function ensureDirectConversation(
  aId: string,
  bId: string
): Promise<ConversationDoc> {
  await connectDB();
  const directKey = directKeyFor(aId, bId);
  const conv = await Conversation.findOneAndUpdate(
    { kind: "direct", directKey },
    {
      $setOnInsert: {
        kind: "direct",
        directKey,
        participantIds: [aId, bId],
        reads: [],
      },
    },
    { upsert: true, new: true }
  ).exec();
  return conv as ConversationDoc;
}

function lastReadFor(conv: ConversationDoc, userId: string): Date | null {
  const r = (conv.reads ?? []).find((x) => x.userId?.toString() === userId);
  return r?.lastReadAt ?? null;
}

/** Bitta suhbatdagi o'qilmagan xabarlar soni (o'zi yozganlari hisobga olinmaydi). */
export async function unreadCount(
  conv: ConversationDoc,
  userId: string
): Promise<number> {
  const since = lastReadFor(conv, userId);
  const filter: Record<string, unknown> = {
    conversationId: conv._id,
    senderId: { $ne: userId },
  };
  if (since) filter.createdAt = { $gt: since };
  return Message.countDocuments(filter).exec();
}

/**
 * Joriy foydalanuvchining barcha suhbatlari (guruh + shaxsiy),
 * o'qilmagan soni bilan, oxirgi faoliyat bo'yicha saralangan.
 */
export async function listConversationsFor(
  me: Me
): Promise<ChatConversation[]> {
  await connectDB();
  const myId = sid(me._id);
  const groupIds = await userGroupIds(me);

  // Har bir mavjud guruh uchun suhbat bor bo'lishini kafolatlaymiz.
  await Promise.all(groupIds.map((gid) => ensureGroupConversation(gid)));

  const convs = await Conversation.find({
    $or: [
      { kind: "group", groupId: { $in: groupIds } },
      { kind: "direct", participantIds: myId },
    ],
  })
    .sort({ lastMessageAt: -1 })
    .lean<ConversationDoc[]>()
    .exec();

  const withUnread = await Promise.all(
    convs.map(async (c) => sConversation(c, await unreadCount(c, myId)))
  );

  // lastMessageAt yo'q (bo'sh) suhbatlar oxiriga tushsin.
  return withUnread.sort((a, b) => {
    const ta = a.lastMessageAt ? +new Date(a.lastMessageAt) : 0;
    const tb = b.lastMessageAt ? +new Date(b.lastMessageAt) : 0;
    return tb - ta;
  });
}

/** Guruh suhbatining barcha a'zo id'lari (real-time yuborish uchun). */
export async function groupMemberIds(groupId: string): Promise<string[]> {
  const group = await Group.findById(groupId).lean().exec();
  if (!group) return [];
  return [group.teacherId.toString(), ...(group.studentIds ?? []).map((s) => s.toString())];
}

export { sid };
