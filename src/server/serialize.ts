import type { Types } from "mongoose";
import type {
  UserDoc,
  GroupDoc,
  PostDoc,
  AssignmentDoc,
  SubmissionDoc,
  NotificationDoc,
  AnnouncementDoc,
  TestDoc,
  TestAttemptDoc,
  ConversationDoc,
  MessageDoc,
} from "./models";
import type {
  AppNotification,
  Assignment,
  Attachment,
  ChatConversation,
  ChatMessage,
  Comment,
  Group,
  Post,
  Question,
  Submission,
  Test,
  TestAttempt,
  User,
} from "@/lib/types";

const id = (v: unknown): string => {
  if (!v) return "";
  // ObjectId or string
  return typeof v === "string" ? v : (v as Types.ObjectId).toString();
};

const iso = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString() : undefined;

interface RawAttachment {
  _id?: Types.ObjectId | string;
  kind: Attachment["kind"];
  name: string;
  meta?: string;
  url?: string;
}

interface RawReaction {
  userId: Types.ObjectId | string;
  emoji: string;
}

interface RawComment {
  _id?: Types.ObjectId | string;
  authorId: Types.ObjectId | string;
  body: string;
  createdAt: Date | string;
}

export function sUser(u: UserDoc): User {
  return {
    id: id(u._id),
    name: u.name,
    email: u.email,
    role: u.role as User["role"],
    hue: u.hue,
    headline: u.headline ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
  };
}

export function sGroup(g: GroupDoc): Group {
  return {
    id: id(g._id),
    name: g.name,
    subject: g.subject,
    emoji: g.emoji,
    gradient: g.gradient,
    teacherId: id(g.teacherId),
    studentIds: (g.studentIds ?? []).map(id),
    description: g.description,
  };
}

export function sAttachment(a: RawAttachment): Attachment {
  return {
    id: id(a._id),
    kind: a.kind,
    name: a.name,
    meta: a.meta ?? undefined,
    url: a.url ?? undefined,
  };
}

export function sComment(c: RawComment): Comment {
  return {
    id: id(c._id),
    authorId: id(c.authorId),
    body: c.body,
    createdAt: iso(c.createdAt)!,
  };
}

export function sPost(p: PostDoc & { createdAt: Date }): Post {
  // group individual reaction rows into { emoji, userIds[] }
  const byEmoji = new Map<string, string[]>();
  for (const r of (p.reactions ?? []) as RawReaction[]) {
    const arr = byEmoji.get(r.emoji) ?? [];
    arr.push(id(r.userId));
    byEmoji.set(r.emoji, arr);
  }
  return {
    id: id(p._id),
    groupId: id(p.groupId),
    authorId: id(p.authorId),
    type: p.type as Post["type"],
    title: p.title,
    body: p.body,
    createdAt: iso(p.createdAt)!,
    viewCount: (p.views as unknown[] | undefined)?.length ?? 0,
    tags: p.tags && p.tags.length ? [...p.tags] : undefined,
    pinned: p.pinned,
    assignmentId: p.assignmentId ? id(p.assignmentId) : undefined,
    attachments: ((p.attachments ?? []) as RawAttachment[]).map(sAttachment),
    reactions: Array.from(byEmoji.entries()).map(([emoji, userIds]) => ({
      emoji,
      userIds,
    })),
    comments: ((p.comments ?? []) as RawComment[])
      .slice()
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .map(sComment),
  };
}

export function sAssignment(
  a: AssignmentDoc & { createdAt: Date }
): Assignment {
  return {
    id: id(a._id),
    groupId: id(a.groupId),
    title: a.title,
    description: a.description,
    dueDate: iso(a.dueDate)!,
    points: a.points,
    createdAt: iso(a.createdAt)!,
    attachments: ((a.attachments ?? []) as RawAttachment[]).map(sAttachment),
  };
}

export function sSubmission(s: SubmissionDoc): Submission {
  return {
    id: id(s._id),
    assignmentId: id(s.assignmentId),
    studentId: id(s.studentId),
    body: s.body,
    status: s.status as Submission["status"],
    submittedAt: iso(s.submittedAt),
    updatedAt: iso(s.updatedAt)!,
    score: s.score ?? undefined,
    feedback: s.feedback ?? undefined,
    attachments: ((s.attachments ?? []) as RawAttachment[]).map(sAttachment),
  };
}

export function sNotification(
  n: NotificationDoc & { createdAt: Date }
): AppNotification {
  return {
    id: id(n._id),
    userId: id(n.userId),
    type: n.type as AppNotification["type"],
    title: n.title,
    body: n.body,
    createdAt: iso(n.createdAt)!,
    read: n.read,
    groupId: n.groupId ? id(n.groupId) : undefined,
    link: n.link ?? undefined,
  };
}

export interface AnnouncementDTO {
  id: string;
  authorId: string;
  scope: "school" | "group";
  groupId?: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

export function sAnnouncement(
  a: AnnouncementDoc & { createdAt: Date }
): AnnouncementDTO {
  return {
    id: id(a._id),
    authorId: id(a.authorId),
    scope: a.scope as "school" | "group",
    groupId: a.groupId ? id(a.groupId) : undefined,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    createdAt: iso(a.createdAt)!,
  };
}

interface RawOption {
  _id?: Types.ObjectId | string;
  text: string;
}
interface RawQuestion {
  _id?: Types.ObjectId | string;
  type: Question["type"];
  text: string;
  imageUrl?: string;
  options?: RawOption[];
  correctOptionId?: string;
  correctText?: string;
  points?: number;
}

function sQuestion(q: RawQuestion, includeAnswer: boolean): Question {
  return {
    id: id(q._id),
    type: q.type,
    text: q.text,
    imageUrl: q.imageUrl ?? undefined,
    options: (q.options ?? []).map((o) => ({ id: id(o._id), text: o.text })),
    correctOptionId: includeAnswer ? q.correctOptionId ?? undefined : undefined,
    correctText: includeAnswer ? q.correctText ?? undefined : undefined,
    points: q.points ?? 1,
  };
}

/**
 * `includeQuestions` — o'qituvchi/muallif to'liq savol+javoblarni oladi.
 * O'quvchi ro'yxatda faqat meta oladi (savollar bo'sh, javoblar yashiringan).
 */
export function sTest(
  t: TestDoc & { createdAt: Date },
  includeQuestions: boolean
): Test {
  const rawQs = (t.questions ?? []) as RawQuestion[];
  const totalPoints = rawQs.reduce((sum, q) => sum + (q.points ?? 1), 0);
  return {
    id: id(t._id),
    groupId: id(t.groupId),
    authorId: id(t.authorId),
    title: t.title,
    subject: t.subject ?? "",
    description: t.description ?? "",
    durationMin: t.durationMin ?? 30,
    questions: includeQuestions
      ? rawQs.map((q) => sQuestion(q, true))
      : [],
    questionCount: rawQs.length,
    totalPoints,
    shuffleQuestions: !!t.shuffleQuestions,
    shuffleOptions: !!t.shuffleOptions,
    maxViolations: t.maxViolations ?? 3,
    status: t.status as Test["status"],
    opensAt: iso(t.opensAt),
    closesAt: iso(t.closesAt),
    createdAt: iso(t.createdAt)!,
  };
}

/** `unread` — joriy foydalanuvchi uchun so'rovda alohida hisoblanadi. */
export function sConversation(
  c: ConversationDoc,
  unread = 0
): ChatConversation {
  const lm = c.lastMessage as
    | { body?: string; senderId?: unknown; at?: Date | string }
    | undefined;
  return {
    id: id(c._id),
    kind: c.kind as ChatConversation["kind"],
    groupId: c.groupId ? id(c.groupId) : undefined,
    participantIds: (c.participantIds ?? []).map(id),
    lastMessage:
      lm && lm.at
        ? { body: lm.body ?? "", senderId: id(lm.senderId), at: iso(lm.at)! }
        : undefined,
    lastMessageAt: iso(c.lastMessageAt),
    unread,
  };
}

export function sMessage(m: MessageDoc & { createdAt: Date }): ChatMessage {
  // group individual reaction rows into { emoji, userIds[] }
  const byEmoji = new Map<string, string[]>();
  for (const r of (m.reactions ?? []) as RawReaction[]) {
    const arr = byEmoji.get(r.emoji) ?? [];
    arr.push(id(r.userId));
    byEmoji.set(r.emoji, arr);
  }
  const rt = m.replyTo as
    | { messageId?: unknown; senderId?: unknown; preview?: string }
    | undefined;
  return {
    id: id(m._id),
    conversationId: id(m.conversationId),
    senderId: id(m.senderId),
    body: m.body ?? "",
    attachments: ((m.attachments ?? []) as RawAttachment[]).map(sAttachment),
    reactions: Array.from(byEmoji.entries()).map(([emoji, userIds]) => ({
      emoji,
      userIds,
    })),
    replyTo:
      rt && rt.messageId
        ? {
            messageId: id(rt.messageId),
            senderId: id(rt.senderId),
            preview: rt.preview ?? "",
          }
        : undefined,
    createdAt: iso(m.createdAt)!,
  };
}

export function sTestAttempt(a: TestAttemptDoc): TestAttempt {
  return {
    id: id(a._id),
    testId: id(a.testId),
    studentId: id(a.studentId),
    startedAt: iso(a.startedAt)!,
    endsAt: iso(a.endsAt)!,
    submittedAt: iso(a.submittedAt),
    status: a.status as TestAttempt["status"],
    score: a.score ?? 0,
    maxScore: a.maxScore ?? 0,
    correctCount: a.correctCount ?? 0,
    totalCount: a.totalCount ?? 0,
    violations: a.violations ?? 0,
    answers: (a.answers ?? []).map((an) => ({
      questionId: an.questionId,
      optionId: an.optionId ?? undefined,
      text: an.text ?? undefined,
      correct: typeof an.correct === "boolean" ? an.correct : undefined,
    })),
  };
}
