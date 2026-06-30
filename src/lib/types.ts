export type Role = "admin" | "teacher" | "student";

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  /** tailwind gradient pair for avatar */
  hue: string;
  headline?: string;
  /** uploaded avatar image url (overrides the gradient initials) */
  avatarUrl?: string;
}

export type AttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "doc"
  | "slides"
  | "link";

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  meta?: string; // e.g. "2.4 MB", "12 min", "8 slides"
  /** download/preview URL for uploaded files (e.g. /uploads/<uuid>.pdf) */
  url?: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type PostType = "lesson" | "announcement" | "assignment";

export interface Post {
  id: string;
  groupId: string;
  authorId: string;
  type: PostType;
  title: string;
  body: string;
  createdAt: string;
  tags?: string[];
  attachments: Attachment[];
  reactions: Reaction[];
  comments: Comment[];
  /** present when type === "assignment" */
  assignmentId?: string;
  pinned?: boolean;
}

export interface Assignment {
  id: string;
  groupId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
  attachments: Attachment[];
  createdAt: string;
}

export type SubmissionStatus =
  | "not_started"
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  body: string;
  attachments: Attachment[];
  status: SubmissionStatus;
  submittedAt?: string;
  updatedAt: string;
  score?: number;
  feedback?: string;
}

export interface Group {
  id: string;
  name: string;
  subject: string;
  emoji: string;
  /** tailwind gradient classes for cover */
  gradient: string;
  teacherId: string;
  studentIds: string[];
  description: string;
}

export type NotificationType =
  | "lesson"
  | "assignment"
  | "deadline"
  | "feedback"
  | "grade"
  | "comment"
  | "announcement";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  groupId?: string;
  link?: string;
}
