import type { Types } from "mongoose";
import type {
  UserDoc,
  GroupDoc,
  PostDoc,
  AssignmentDoc,
  SubmissionDoc,
  NotificationDoc,
  AnnouncementDoc,
} from "./models";
import type {
  AppNotification,
  Assignment,
  Attachment,
  Comment,
  Group,
  Post,
  Submission,
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
