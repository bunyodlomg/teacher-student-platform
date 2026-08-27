"use client";

import { create } from "zustand";
import { Attachment, ChatConversation, ChatMessage } from "@/lib/types";
import { getSocket } from "@/lib/socket";
import { useSession } from "@/store/session";

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

/** Suhbatlarni oxirgi faoliyat bo'yicha saralab qaytaradi. */
function sortConvs(list: ChatConversation[]): ChatConversation[] {
  return list.slice().sort((a, b) => {
    const ta = a.lastMessageAt ? +new Date(a.lastMessageAt) : 0;
    const tb = b.lastMessageAt ? +new Date(b.lastMessageAt) : 0;
    return tb - ta;
  });
}

function upsertConv(
  list: ChatConversation[],
  conv: ChatConversation
): ChatConversation[] {
  const i = list.findIndex((c) => c.id === conv.id);
  const next = list.slice();
  if (i === -1) next.push(conv);
  else next[i] = conv;
  return sortConvs(next);
}

/** convId -> userId -> { name, at(ms) } — "yozmoqda..." holati (vaqtinchalik). */
type TypingMap = Record<string, Record<string, { name: string; at: number }>>;

interface ChatState {
  conversations: ChatConversation[];
  messagesByConv: Record<string, ChatMessage[]>;
  hasMoreByConv: Record<string, boolean>;
  typingByConv: TypingMap;
  activeId: string | null;
  loadedList: boolean;
  loadingList: boolean;
  loadingMsgs: Record<string, boolean>;

  loadConversations: () => Promise<void>;
  setActive: (id: string | null) => void;
  loadMessages: (convId: string) => Promise<void>;
  loadOlder: (convId: string) => Promise<void>;
  sendMessage: (
    convId: string,
    body: string,
    attachments?: Attachment[],
    replyToId?: string
  ) => Promise<void>;
  deleteMessage: (convId: string, messageId: string) => Promise<void>;
  reactToMessage: (
    convId: string,
    messageId: string,
    emoji: string
  ) => Promise<void>;
  emitTyping: (convId: string) => void;
  markRead: (convId: string) => Promise<void>;
  startDirect: (userId: string) => Promise<string | null>;
  totalUnread: () => number;
  clear: () => void;
}

let wired = false;
// "yozmoqda..." yozuvlarini avtomatik tozalash uchun taymerlar
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
// typing signalini kamdan-kam yuborish uchun (throttle)
const lastTypingSent = new Map<string, number>();

export const useChat = create<ChatState>()((set, get) => ({
  conversations: [],
  messagesByConv: {},
  hasMoreByConv: {},
  typingByConv: {},
  activeId: null,
  loadedList: false,
  loadingList: false,
  loadingMsgs: {},

  loadConversations: async () => {
    if (get().loadingList) return;
    set({ loadingList: true });
    try {
      const res = await fetch("/api/chat", { credentials: "include" });
      if (!res.ok) {
        set({ loadingList: false });
        return;
      }
      const data = await res.json();
      set({
        conversations: sortConvs(data.conversations ?? []),
        loadedList: true,
        loadingList: false,
      });
    } catch {
      set({ loadingList: false });
      return;
    }

    if (!wired) {
      wired = true;
      const socket = getSocket();
      socket.on(
        "chat:message",
        (payload: { message: ChatMessage; conversation: ChatConversation }) => {
          const { message, conversation } = payload;
          const meId = useSession.getState().currentUserId;
          const convId = message.conversationId;
          const isMine = message.senderId === meId;
          const active =
            get().activeId === convId &&
            typeof document !== "undefined" &&
            document.visibilityState === "visible";

          set((st) => {
            // xabarni tredga qo'shamiz (agar u yuklangan bo'lsa)
            let messagesByConv = st.messagesByConv;
            const existingMsgs = messagesByConv[convId];
            if (existingMsgs && !existingMsgs.some((m) => m.id === message.id)) {
              messagesByConv = {
                ...messagesByConv,
                [convId]: [...existingMsgs, message],
              };
            }

            // suhbatni yangilaymiz + o'qilmagan sonini hisoblaymiz
            const existing = st.conversations.find((c) => c.id === convId);
            const baseUnread = existing?.unread ?? 0;
            const unread =
              isMine || active ? (active ? 0 : baseUnread) : baseUnread + 1;
            const merged: ChatConversation = {
              ...(existing ?? conversation),
              ...conversation,
              unread,
            };
            return {
              messagesByConv,
              conversations: upsertConv(st.conversations, merged),
            };
          });

          if (active) get().markRead(convId);
        }
      );

      // "yozmoqda..." signali
      socket.on(
        "chat:typing",
        (p: { conversationId: string; userId: string; name: string }) => {
          const meId = useSession.getState().currentUserId;
          if (p.userId === meId) return;
          const key = `${p.conversationId}:${p.userId}`;
          set((st) => {
            const conv = { ...(st.typingByConv[p.conversationId] ?? {}) };
            conv[p.userId] = { name: p.name, at: Date.now() };
            return {
              typingByConv: { ...st.typingByConv, [p.conversationId]: conv },
            };
          });
          // 4 soniyadan keyin o'chiramiz (yangilanmasa)
          const prev = typingTimers.get(key);
          if (prev) clearTimeout(prev);
          typingTimers.set(
            key,
            setTimeout(() => {
              typingTimers.delete(key);
              set((st) => {
                const conv = { ...(st.typingByConv[p.conversationId] ?? {}) };
                delete conv[p.userId];
                return {
                  typingByConv: {
                    ...st.typingByConv,
                    [p.conversationId]: conv,
                  },
                };
              });
            }, 4000)
          );
        }
      );

      // xabar yangilandi (reaksiya qo'shildi/olib tashlandi)
      socket.on("chat:message-updated", (p: { message: ChatMessage }) => {
        const msg = p.message;
        set((st) => {
          const list = st.messagesByConv[msg.conversationId];
          if (!list) return {};
          return {
            messagesByConv: {
              ...st.messagesByConv,
              [msg.conversationId]: list.map((m) =>
                m.id === msg.id ? msg : m
              ),
            },
          };
        });
      });

      // xabar o'chirildi
      socket.on(
        "chat:message-deleted",
        (p: {
          conversationId: string;
          messageId: string;
          lastMessage: ChatConversation["lastMessage"] | null;
          lastMessageAt: string | null;
        }) => {
          set((st) => {
            const existing = st.messagesByConv[p.conversationId];
            const messagesByConv = existing
              ? {
                  ...st.messagesByConv,
                  [p.conversationId]: existing.filter(
                    (m) => m.id !== p.messageId
                  ),
                }
              : st.messagesByConv;
            const conversations = st.conversations.map((c) =>
              c.id === p.conversationId
                ? {
                    ...c,
                    lastMessage: p.lastMessage ?? undefined,
                    lastMessageAt: p.lastMessageAt ?? undefined,
                  }
                : c
            );
            return { messagesByConv, conversations: sortConvs(conversations) };
          });
        }
      );

      // qayta ulanish / a'zolik o'zgarganda ro'yxatni yangilash
      socket.on("state:refresh", () => {
        set({ loadedList: false });
        get().loadConversations();
      });
    }
  },

  setActive: (id) => {
    set({ activeId: id });
    if (id) {
      if (!get().messagesByConv[id]) get().loadMessages(id);
      get().markRead(id);
    }
  },

  loadMessages: async (convId) => {
    if (get().loadingMsgs[convId]) return;
    set((st) => ({ loadingMsgs: { ...st.loadingMsgs, [convId]: true } }));
    try {
      const res = await fetch(`/api/chat/${convId}/messages`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        set((st) => ({
          messagesByConv: { ...st.messagesByConv, [convId]: data.messages ?? [] },
          hasMoreByConv: { ...st.hasMoreByConv, [convId]: !!data.hasMore },
          loadingMsgs: { ...st.loadingMsgs, [convId]: false },
        }));
      } else {
        set((st) => ({ loadingMsgs: { ...st.loadingMsgs, [convId]: false } }));
      }
    } catch {
      set((st) => ({ loadingMsgs: { ...st.loadingMsgs, [convId]: false } }));
    }
  },

  loadOlder: async (convId) => {
    const current = get().messagesByConv[convId] ?? [];
    if (current.length === 0 || get().loadingMsgs[convId]) return;
    const before = current[0].createdAt;
    set((st) => ({ loadingMsgs: { ...st.loadingMsgs, [convId]: true } }));
    try {
      const res = await fetch(
        `/api/chat/${convId}/messages?before=${encodeURIComponent(before)}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        set((st) => ({
          messagesByConv: {
            ...st.messagesByConv,
            [convId]: [...(data.messages ?? []), ...(st.messagesByConv[convId] ?? [])],
          },
          hasMoreByConv: { ...st.hasMoreByConv, [convId]: !!data.hasMore },
          loadingMsgs: { ...st.loadingMsgs, [convId]: false },
        }));
      } else {
        set((st) => ({ loadingMsgs: { ...st.loadingMsgs, [convId]: false } }));
      }
    } catch {
      set((st) => ({ loadingMsgs: { ...st.loadingMsgs, [convId]: false } }));
    }
  },

  sendMessage: async (convId, body, attachments, replyToId) => {
    const text = body.trim();
    const files = attachments ?? [];
    if (!text && files.length === 0) return;
    const { ok, data } = await postJSON(`/api/chat/${convId}/messages`, {
      body: text,
      attachments: files,
      replyToId,
    });
    if (ok && data.message) {
      // socket echo ham keladi, lekin darhol ko'rsatamiz (id bo'yicha dedupe)
      set((st) => {
        const existingMsgs = st.messagesByConv[convId] ?? [];
        const messagesByConv = existingMsgs.some((m) => m.id === data.message.id)
          ? st.messagesByConv
          : {
              ...st.messagesByConv,
              [convId]: [...existingMsgs, data.message],
            };
        const existing = st.conversations.find((c) => c.id === convId);
        const merged: ChatConversation = {
          ...(existing ?? data.conversation),
          ...data.conversation,
          unread: 0,
        };
        return {
          messagesByConv,
          conversations: upsertConv(st.conversations, merged),
        };
      });
    }
  },

  deleteMessage: async (convId, messageId) => {
    // optimistik o'chirish
    set((st) => {
      const existing = st.messagesByConv[convId];
      if (!existing) return {};
      return {
        messagesByConv: {
          ...st.messagesByConv,
          [convId]: existing.filter((m) => m.id !== messageId),
        },
      };
    });
    try {
      await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      /* socket voqeasi holatni baribir moslashtiradi */
    }
  },

  reactToMessage: async (convId, messageId, emoji) => {
    const meId = useSession.getState().currentUserId;
    // optimistik toggle (server + socket keyin moslashtiradi)
    if (meId) {
      set((st) => {
        const list = st.messagesByConv[convId];
        if (!list) return {};
        return {
          messagesByConv: {
            ...st.messagesByConv,
            [convId]: list.map((m) => {
              if (m.id !== messageId) return m;
              const existing = m.reactions.find((r) => r.emoji === emoji);
              let reactions = m.reactions;
              if (existing) {
                const has = existing.userIds.includes(meId);
                reactions = m.reactions
                  .map((r) =>
                    r.emoji === emoji
                      ? {
                          ...r,
                          userIds: has
                            ? r.userIds.filter((u) => u !== meId)
                            : [...r.userIds, meId],
                        }
                      : r
                  )
                  .filter((r) => r.userIds.length > 0);
              } else {
                reactions = [...m.reactions, { emoji, userIds: [meId] }];
              }
              return { ...m, reactions };
            }),
          },
        };
      });
    }
    const { ok, data } = await postJSON(
      `/api/chat/messages/${messageId}/react`,
      { emoji }
    );
    if (ok && data.message) {
      set((st) => {
        const list = st.messagesByConv[convId];
        if (!list) return {};
        return {
          messagesByConv: {
            ...st.messagesByConv,
            [convId]: list.map((m) =>
              m.id === data.message.id ? data.message : m
            ),
          },
        };
      });
    }
  },

  emitTyping: (convId) => {
    const now = Date.now();
    const last = lastTypingSent.get(convId) ?? 0;
    if (now - last < 2500) return; // 2.5s da bir marta
    lastTypingSent.set(convId, now);
    try {
      getSocket().emit("chat:typing", { conversationId: convId });
    } catch {
      /* ignore */
    }
  },

  markRead: async (convId) => {
    const conv = get().conversations.find((c) => c.id === convId);
    if (conv && conv.unread === 0) return;
    set((st) => ({
      conversations: st.conversations.map((c) =>
        c.id === convId ? { ...c, unread: 0 } : c
      ),
    }));
    await postJSON(`/api/chat/${convId}/read`).catch(() => {});
  },

  startDirect: async (userId) => {
    const { ok, data } = await postJSON("/api/chat/direct", { userId });
    if (ok && data.conversation) {
      set((st) => ({
        conversations: upsertConv(st.conversations, data.conversation),
      }));
      return data.conversation.id as string;
    }
    return null;
  },

  totalUnread: () =>
    get().conversations.reduce((sum, c) => sum + (c.unread || 0), 0),

  clear: () => {
    typingTimers.forEach((t) => clearTimeout(t));
    typingTimers.clear();
    lastTypingSent.clear();
    set({
      conversations: [],
      messagesByConv: {},
      hasMoreByConv: {},
      typingByConv: {},
      activeId: null,
      loadedList: false,
      loadingList: false,
      loadingMsgs: {},
    });
  },
}));
