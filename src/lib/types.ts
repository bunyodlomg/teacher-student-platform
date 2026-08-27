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
  /** number of unique users who have viewed this post */
  viewCount: number;
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

// ---- Online DTM / testlar ----

/** single = bir javobli (A/B/C/D) · boolean = to'g'ri/noto'g'ri · short = qisqa yozma */
export type QuestionType = "single" | "boolean" | "short";

export interface TestOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  /** single/boolean uchun variantlar; short uchun bo'sh */
  options: TestOption[];
  /** single/boolean — TO'G'RI javob. Faqat o'qituvchiga / baholashdan keyin yuboriladi. */
  correctOptionId?: string;
  /** short — to'g'ri matn (katta-kichik harfsiz solishtiriladi). Faqat o'qituvchiga. */
  correctText?: string;
  points: number;
}

export type TestStatus = "draft" | "open" | "closed";

export interface Test {
  id: string;
  groupId: string;
  authorId: string;
  title: string;
  subject: string;
  description: string;
  durationMin: number;
  /** to'liq (o'qituvchi) yoki bo'sh (o'quvchi ro'yxatda) */
  questions: Question[];
  questionCount: number;
  totalPoints: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** fokus yo'qolishi shu songa yetganda ogohlantiriladi */
  maxViolations: number;
  /** ochiq (loginsiz) test — mehmonlar havola/landing orqali ishlay oladi */
  isPublic: boolean;
  status: TestStatus;
  opensAt?: string;
  closesAt?: string;
  createdAt: string;
}

/** Imtihon paytida o'quvchiga yuboriladigan xavfsiz savol (to'g'ri javobsiz). */
export interface ExamQuestion {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  options: TestOption[];
  points: number;
}

export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "auto_submitted";

export interface AttemptAnswer {
  questionId: string;
  /** single/boolean */
  optionId?: string;
  /** short */
  text?: string;
  /** baholashdan keyin to'ldiriladi */
  correct?: boolean;
}

export interface GuestInfo {
  name: string;
  grade?: string;
  phone?: string;
}

export interface TestAttempt {
  id: string;
  testId: string;
  studentId: string;
  /** loginи yo'q (mehmon) urinishimi */
  isGuest?: boolean;
  /** mehmon ma'lumotlari (ism/sinf/telefon) */
  guest?: GuestInfo;
  startedAt: string;
  /** startedAt + durationMin — server hisoblaydi */
  endsAt: string;
  submittedAt?: string;
  status: AttemptStatus;
  score: number;
  maxScore: number;
  correctCount: number;
  totalCount: number;
  /** fokus yo'qolishi soni */
  violations: number;
  answers: AttemptAnswer[];
}

// ---- Suhbatlar (chat) ----

/** group = guruh umumiy chati · direct = ikki kishilik shaxsiy chat */
export type ChatKind = "group" | "direct";

export interface ChatMessagePreview {
  body: string;
  senderId: string;
  at: string;
}

export interface ChatConversation {
  id: string;
  kind: ChatKind;
  /** guruh chati uchun */
  groupId?: string;
  /** shaxsiy chat a'zolari (ikki foydalanuvchi id) */
  participantIds: string[];
  lastMessage?: ChatMessagePreview;
  lastMessageAt?: string;
  /** joriy foydalanuvchi uchun o'qilmagan xabarlar soni */
  unread: number;
}

/** Javob berilgan xabar suratи. */
export interface ChatReplyPreview {
  messageId: string;
  senderId: string;
  preview: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachments: Attachment[];
  reactions: Reaction[];
  replyTo?: ChatReplyPreview;
  createdAt: string;
}
