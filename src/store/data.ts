"use client";

import { create } from "zustand";
import {
  AppNotification,
  Assignment,
  Attachment,
  Group,
  Post,
  Role,
  Submission,
  SubmissionStatus,
  User,
} from "@/lib/types";
import { getSocket } from "@/lib/socket";

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

export const useData = create<DataState>()((set, get) => ({
  users: [],
  groups: [],
  posts: [],
  assignments: [],
  submissions: [],
  notifications: [],
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

  clear: () =>
    set({
      users: [],
      groups: [],
      posts: [],
      assignments: [],
      submissions: [],
      notifications: [],
      loaded: false,
    }),

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
}));
