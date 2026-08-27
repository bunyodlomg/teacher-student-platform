"use client";

import { create } from "zustand";
import {
  AppNotification,
  Assignment,
  Attachment,
  ExamQuestion,
  Group,
  Post,
  Role,
  Submission,
  SubmissionStatus,
  Test,
  TestAttempt,
  User,
} from "@/lib/types";
import { getSocket } from "@/lib/socket";

export interface NewTestQuestion {
  type: "single" | "boolean" | "short";
  text: string;
  imageUrl?: string;
  options?: { text: string }[];
  correctIndex?: number;
  correctText?: string;
  points?: number;
}
export interface NewTestInput {
  groupId: string;
  title: string;
  subject?: string;
  description?: string;
  durationMin: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  maxViolations?: number;
  isPublic?: boolean;
  questions: NewTestQuestion[];
}

interface NewPostInput {
  groupId: string;
  authorId: string;
  type: Post["type"];
  title: string;
  body: string;
  tags?: string[];
  attachments?: Attachment[];
  /** lesson only: open it for student submissions (creates a linked task) */
  allowSubmissions?: boolean;
  dueDate?: string;
  points?: number;
}

interface NewAssignmentInput {
  groupId: string;
  authorId: string;
  title: string;
  description: string;
  dueDate: string;
  points: number;
  attachments?: Attachment[];
  announcement?: string;
}

interface DataState {
  users: User[];
  groups: Group[];
  posts: Post[];
  assignments: Assignment[];
  submissions: Submission[];
  notifications: AppNotification[];
  tests: Test[];
  attempts: TestAttempt[];

  loaded: boolean;
  loading: boolean;

  /** Fetch all data for the current user and wire real-time updates. */
  bootstrap: () => Promise<void>;
  /** Clear everything (on logout). */
  clear: () => void;

  // ---- feed / social ----
  addPost: (input: NewPostInput) => Promise<void>;
  editPost: (
    postId: string,
    data: {
      title: string;
      body: string;
      tags?: string[];
      attachments?: Attachment[];
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  deletePost: (postId: string) => Promise<{ ok: boolean; error?: string }>;
  toggleReaction: (postId: string, emoji: string, userId: string) => Promise<void>;
  addComment: (postId: string, authorId: string, body: string) => Promise<void>;
  /** Register a unique view once the current user has seen a post. */
  viewPost: (postId: string) => void;

  // ---- assignments ----
  createAssignment: (input: NewAssignmentInput) => Promise<void>;

  // ---- submissions ----
  upsertSubmission: (
    assignmentId: string,
    studentId: string,
    data: { body: string; attachments?: Attachment[]; status: SubmissionStatus }
  ) => Promise<void>;
  gradeSubmission: (
    submissionId: string,
    data: {
      status: Extract<SubmissionStatus, "approved" | "rejected">;
      score?: number;
      feedback?: string;
    }
  ) => Promise<void>;

  // ---- tests (DTM) ----
  createTest: (
    input: NewTestInput
  ) => Promise<{ ok: boolean; testId?: string; error?: string }>;
  setTestStatus: (
    testId: string,
    status: Test["status"]
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteTest: (testId: string) => Promise<{ ok: boolean; error?: string }>;
  startAttempt: (testId: string) => Promise<{
    ok: boolean;
    error?: string;
    questions?: ExamQuestion[];
    attempt?: TestAttempt;
  }>;
  saveAnswer: (
    testId: string,
    questionId: string,
    data: { optionId?: string; text?: string }
  ) => void;
  submitAttempt: (
    testId: string,
    answers: { questionId: string; optionId?: string; text?: string }[],
    violations: number
  ) => Promise<{ ok: boolean; error?: string; attempt?: TestAttempt }>;
  reportViolation: (testId: string) => void;

  // ---- notifications ----
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;

  // ---- admin ----
  addUser: (u: {
    name: string;
    email: string;
    role: Role;
    headline?: string;
    password?: string;
  }) => Promise<{ ok: boolean; tempPassword?: string; error?: string }>;
  addGroup: (g: {
    name: string;
    subject: string;
    description: string;
    teacherId: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** Create a group as a teacher/student (not the admin-only endpoint). */
  createGroup: (g: {
    name: string;
    subject: string;
    description: string;
    teacherId?: string;
    studentIds?: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  updateGroupMembers: (
    groupId: string,
    studentIds: string[]
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Edit a group's name/subject/description (owner teacher or admin). */
  updateGroup: (
    groupId: string,
    data: { name?: string; subject?: string; description?: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Delete a group and its scoped content (owner teacher or admin). */
  deleteGroup: (groupId: string) => Promise<{ ok: boolean; error?: string }>;
}

async function postJSON(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as { ok: boolean; data: any };
}

// ---- pure upsert helpers (dedupe by id) ----
const upsertById = <T extends { id: string }>(list: T[], item: T): T[] => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [item, ...list];
  const copy = list.slice();
  copy[i] = item;
  return copy;
};

let wired = false;
// posts already reported as viewed this session — avoids re-hitting the API
const seenViews = new Set<string>();

export const useData = create<DataState>()((set, get) => ({
  users: [],
  groups: [],
  posts: [],
  assignments: [],
  submissions: [],
  notifications: [],
  tests: [],
  attempts: [],
  loaded: false,
  loading: false,

  bootstrap: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/state", { credentials: "include" });
      if (!res.ok) {
        set({ loading: false });
        return;
      }
      const s = await res.json();
      set({
        users: s.users ?? [],
        groups: s.groups ?? [],
        posts: s.posts ?? [],
        assignments: s.assignments ?? [],
        submissions: s.submissions ?? [],
        notifications: s.notifications ?? [],
        tests: s.tests ?? [],
        attempts: s.attempts ?? [],
        loaded: true,
        loading: false,
      });

      if (!wired) {
        wired = true;
        const socket = getSocket();
        socket.on("feed:new-post", (p: Post) =>
          set((st) => ({ posts: upsertById(st.posts, p) }))
        );
        socket.on("feed:post-updated", (p: Post) =>
          set((st) => ({ posts: upsertById(st.posts, p) }))
        );
        socket.on(
          "feed:post-deleted",
          (payload: { id: string; assignmentId?: string }) =>
            set((st) => ({
              posts: st.posts.filter((p) => p.id !== payload.id),
              assignments: payload.assignmentId
                ? st.assignments.filter((a) => a.id !== payload.assignmentId)
                : st.assignments,
            }))
        );
        socket.on("assignment:new", (a: Assignment) =>
          set((st) => ({ assignments: upsertById(st.assignments, a) }))
        );
        socket.on("submission:updated", (sub: Submission) =>
          set((st) => ({ submissions: upsertById(st.submissions, sub) }))
        );
        socket.on("notification:new", (n: AppNotification) =>
          set((st) => ({ notifications: upsertById(st.notifications, n) }))
        );
        // Test ochildi/yopildi. Kelayotgan meta savolsiz — mavjud savollarni
        // (o'qituvchi qo'lidagi) yo'qotmaslik uchun eskisi bilan birlashtiramiz.
        socket.on("test:updated", (t: Test) =>
          set((st) => {
            const prev = st.tests.find((x) => x.id === t.id);
            const merged =
              prev && (!t.questions || t.questions.length === 0)
                ? { ...t, questions: prev.questions, questionCount: prev.questionCount }
                : t;
            return { tests: upsertById(st.tests, merged) };
          })
        );
        socket.on("test:deleted", (payload: { id: string }) =>
          set((st) => ({
            tests: st.tests.filter((t) => t.id !== payload.id),
            attempts: st.attempts.filter((a) => a.testId !== payload.id),
          }))
        );
        socket.on("test:attempt-updated", (a: TestAttempt) =>
          set((st) => ({ attempts: upsertById(st.attempts, a) }))
        );
        socket.on("group:updated", (g: Group) =>
          set((st) =>
            st.groups.some((x) => x.id === g.id)
              ? { groups: upsertById(st.groups, g) }
              : {}
          )
        );
        socket.on("group:deleted", (payload: { id: string }) =>
          set((st) => ({
            groups: st.groups.filter((g) => g.id !== payload.id),
            posts: st.posts.filter((p) => p.groupId !== payload.id),
            tests: st.tests.filter((t) => t.groupId !== payload.id),
          }))
        );
        // Group membership changed elsewhere (admin added/removed me, or
        // changed a roster). Rejoin socket rooms with fresh membership and
        // reload the scoped state so new groups/feeds appear immediately.
        socket.on("state:refresh", () => {
          socket.disconnect();
          socket.connect();
          set({ loading: false });
          get().bootstrap();
        });
      }
    } catch {
      set({ loading: false });
    }
  },

  clear: () => {
    seenViews.clear();
    set({
      users: [],
      groups: [],
      posts: [],
      assignments: [],
      submissions: [],
      notifications: [],
      tests: [],
      attempts: [],
      loaded: false,
    });
  },

  addPost: async (input) => {
    const { ok, data } = await postJSON("/api/posts", {
      groupId: input.groupId,
      type: input.type,
      title: input.title,
      body: input.body,
      tags: input.tags,
      attachments: input.attachments,
      allowSubmissions: input.allowSubmissions,
      dueDate: input.dueDate,
      points: input.points,
    });
    if (ok && data.post)
      set((st) => ({
        posts: upsertById(st.posts, data.post),
        assignments: data.assignment
          ? upsertById(st.assignments, data.assignment)
          : st.assignments,
      }));
  },

  editPost: async (postId, d) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(d),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        return { ok: false, error: data?.error || "Saqlashda xatolik" };
      set((st) => ({
        posts: data.post ? upsertById(st.posts, data.post) : st.posts,
        assignments: data.assignment
          ? upsertById(st.assignments, data.assignment)
          : st.assignments,
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Tarmoq xatosi" };
    }
  },

  deletePost: async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        return { ok: false, error: data?.error || "O'chirishda xatolik" };
      set((st) => ({
        posts: st.posts.filter((p) => p.id !== postId),
        assignments: data.assignmentId
          ? st.assignments.filter((a) => a.id !== data.assignmentId)
          : st.assignments,
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Tarmoq xatosi" };
    }
  },

  toggleReaction: async (postId, emoji, userId) => {
    // optimistic toggle for snappy UX
    set((st) => ({
      posts: st.posts.map((p) => {
        if (p.id !== postId) return p;
        const existing = p.reactions.find((r) => r.emoji === emoji);
        let reactions = p.reactions;
        if (existing) {
          const has = existing.userIds.includes(userId);
          reactions = p.reactions
            .map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    userIds: has
                      ? r.userIds.filter((u) => u !== userId)
                      : [...r.userIds, userId],
                  }
                : r
            )
            .filter((r) => r.userIds.length > 0);
        } else {
          reactions = [...p.reactions, { emoji, userIds: [userId] }];
        }
        return { ...p, reactions };
      }),
    }));
    const { ok, data } = await postJSON(`/api/posts/${postId}/react`, { emoji });
    if (ok && data.post)
      set((st) => ({ posts: upsertById(st.posts, data.post) }));
  },

  addComment: async (postId, _authorId, body) => {
    const { ok, data } = await postJSON(`/api/posts/${postId}/comment`, { body });
    if (ok && data.post)
      set((st) => ({ posts: upsertById(st.posts, data.post) }));
  },

  viewPost: (postId) => {
    if (seenViews.has(postId)) return;
    seenViews.add(postId);
    postJSON(`/api/posts/${postId}/view`)
      .then(({ ok, data }) => {
        if (ok && typeof data.viewCount === "number") {
          set((st) => ({
            posts: st.posts.map((p) =>
              p.id === postId ? { ...p, viewCount: data.viewCount } : p
            ),
          }));
        } else {
          seenViews.delete(postId); // allow a retry if it failed
        }
      })
      .catch(() => seenViews.delete(postId));
  },

  createAssignment: async (input) => {
    const { ok, data } = await postJSON("/api/assignments", {
      groupId: input.groupId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      points: input.points,
      attachments: input.attachments,
      announcement: input.announcement,
    });
    if (ok) {
      set((st) => ({
        assignments: data.assignment
          ? upsertById(st.assignments, data.assignment)
          : st.assignments,
        posts: data.post ? upsertById(st.posts, data.post) : st.posts,
      }));
    }
  },

  upsertSubmission: async (assignmentId, _studentId, payload) => {
    const { ok, data } = await postJSON("/api/submissions", {
      assignmentId,
      body: payload.body,
      attachments: payload.attachments,
      status: payload.status,
    });
    if (ok && data.submission)
      set((st) => ({
        submissions: upsertById(st.submissions, data.submission),
      }));
  },

  gradeSubmission: async (submissionId, payload) => {
    const { ok, data } = await postJSON(
      `/api/submissions/${submissionId}/grade`,
      payload
    );
    if (ok && data.submission)
      set((st) => ({
        submissions: upsertById(st.submissions, data.submission),
      }));
  },

  createTest: async (input) => {
    const { ok, data } = await postJSON("/api/tests", input);
    if (ok && data.test) {
      set((st) => ({ tests: upsertById(st.tests, data.test) }));
      return { ok: true, testId: data.test.id };
    }
    return { ok: false, error: data?.error || "Yaratishda xatolik" };
  },

  setTestStatus: async (testId, status) => {
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error || "Xatolik" };
      if (data.test) set((st) => ({ tests: upsertById(st.tests, data.test) }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Tarmoq xatosi" };
    }
  },

  deleteTest: async (testId) => {
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error || "Xatolik" };
      set((st) => ({
        tests: st.tests.filter((t) => t.id !== testId),
        attempts: st.attempts.filter((a) => a.testId !== testId),
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Tarmoq xatosi" };
    }
  },

  startAttempt: async (testId) => {
    const { ok, data } = await postJSON(`/api/tests/${testId}/start`);
    if (ok && data.attempt) {
      set((st) => ({ attempts: upsertById(st.attempts, data.attempt) }));
      return { ok: true, attempt: data.attempt, questions: data.questions };
    }
    return { ok: false, error: data?.error || "Boshlab bo'lmadi" };
  },

  saveAnswer: (testId, questionId, d) => {
    // fire-and-forget autosave
    postJSON(`/api/tests/${testId}/answer`, {
      questionId,
      optionId: d.optionId,
      text: d.text,
    }).catch(() => {});
  },

  submitAttempt: async (testId, answers, violations) => {
    const { ok, data } = await postJSON(`/api/tests/${testId}/submit`, {
      answers,
      violations,
    });
    if (ok && data.attempt) {
      set((st) => ({ attempts: upsertById(st.attempts, data.attempt) }));
      return { ok: true, attempt: data.attempt };
    }
    return { ok: false, error: data?.error || "Topshirishda xatolik" };
  },

  reportViolation: (testId) => {
    postJSON(`/api/tests/${testId}/violation`)
      .then(({ ok, data }) => {
        if (ok && typeof data.violations === "number") {
          set((st) => ({
            attempts: st.attempts.map((a) =>
              a.testId === testId && a.status === "in_progress"
                ? { ...a, violations: data.violations }
                : a
            ),
          }));
        }
      })
      .catch(() => {});
  },

  markNotificationRead: async (id) => {
    set((st) => ({
      notifications: st.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    await postJSON("/api/notifications/read", { id });
  },

  markAllRead: async (userId) => {
    set((st) => ({
      notifications: st.notifications.map((n) =>
        n.userId === userId ? { ...n, read: true } : n
      ),
    }));
    await postJSON("/api/notifications/read", {});
  },

  addUser: async (u) => {
    const { ok, data } = await postJSON("/api/admin/users", u);
    if (ok && data.user) {
      set((st) => ({ users: upsertById(st.users, data.user) }));
      return { ok: true, tempPassword: data.tempPassword };
    }
    return { ok: false, error: data?.error };
  },

  addGroup: async (g) => {
    const { ok, data } = await postJSON("/api/admin/groups", g);
    if (ok && data.group) {
      set((st) => ({ groups: upsertById(st.groups, data.group) }));
      return { ok: true };
    }
    return { ok: false, error: data?.error };
  },

  createGroup: async (g) => {
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(g),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        return { ok: false, error: data?.error || "Yaratishda xatolik" };
      if (data.group)
        set((st) => ({ groups: upsertById(st.groups, data.group) }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Tarmoq xatosi" };
    }
  },

  updateGroupMembers: async (groupId, studentIds) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        return { ok: false, error: data?.error || "Saqlashda xatolik" };
      if (data.group)
        set((st) => ({ groups: upsertById(st.groups, data.group) }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Tarmoq xatosi" };
    }
  },

  updateGroup: async (groupId, payload) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        return { ok: false, error: data?.error || "Saqlashda xatolik" };
      if (data.group)
        set((st) => ({ groups: upsertById(st.groups, data.group) }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Tarmoq xatosi" };
    }
  },

  deleteGroup: async (groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error || "Xatolik" };
      set((st) => ({ groups: st.groups.filter((g) => g.id !== groupId) }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Tarmoq xatosi" };
    }
  },
}));
