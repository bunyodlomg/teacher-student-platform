"use client";

import { create } from "zustand";
import { ChatConversation, ChatMessage } from "@/lib/types";
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

interface ChatState {
  conversations: ChatConversation[];
  messagesByConv: Record<string, ChatMessage[]>;
  hasMoreByConv: Record<string, boolean>;
  activeId: string | null;
  loadedList: boolean;
  loadingList: boolean;
  loadingMsgs: Record<string, boolean>;

  loadConversations: () => Promise<void>;
  setActive: (id: string | null) => void;
  loadMessages: (convId: string) => Promise<void>;
  loadOlder: (convId: string) => Promise<void>;
  sendMessage: (convId: string, body: string) => Promise<void>;
  markRead: (convId: string) => Promise<void>;
  startDirect: (userId: string) => Promise<string | null>;
  totalUnread: () => number;
  clear: () => void;
}

let wired = false;

export const useChat = create<ChatState>()((set, get) => ({
  conversations: [],
  messagesByConv: {},
  hasMoreByConv: {},
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

  sendMessage: async (convId, body) => {
    const text = body.trim();
    if (!text) return;
    const { ok, data } = await postJSON(`/api/chat/${convId}/messages`, {
      body: text,
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
    set({
      conversations: [],
      messagesByConv: {},
      hasMoreByConv: {},
      activeId: null,
      loadedList: false,
      loadingList: false,
      loadingMsgs: {},
    });
  },
}));
