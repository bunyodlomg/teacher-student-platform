"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Role, User } from "@/lib/types";

type Theme = "light" | "dark";

interface LoginResult {
  ok: boolean;
  role?: Role;
  error?: string;
}

interface SessionState {
  currentUserId: string | null;
  role: Role | null;
  user: User | null;
  /** false until the first /api/auth/me check has resolved */
  hydrated: boolean;

  /** Ask the server who we are (cookie-based). */
  refresh: () => Promise<void>;
  /** Login (oddiy matn) + parol bilan kirish. */
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** Update own profile (name, headline, avatar hue, password). */
  updateProfile: (data: {
    name?: string;
    headline?: string;
    hue?: string;
    avatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("ts-theme", theme);
  } catch {}
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      currentUserId: null,
      role: null,
      user: null,
      hydrated: false,

      refresh: async () => {
        try {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          if (!res.ok) {
            set({ currentUserId: null, role: null, user: null, hydrated: true });
            return;
          }
          const data = (await res.json()) as { user: User };
          set({
            currentUserId: data.user.id,
            role: data.user.role,
            user: data.user,
            hydrated: true,
          });
        } catch {
          set({ currentUserId: null, role: null, user: null, hydrated: true });
        }
      },

      login: async (email, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            return { ok: false, error: data?.error || "Kirishda xatolik" };
          }
          const user = data.user as User;
          set({
            currentUserId: user.id,
            role: user.role,
            user,
            hydrated: true,
          });
          return { ok: true, role: user.role };
        } catch {
          return { ok: false, error: "Tarmoq xatosi" };
        }
      },

      logout: async () => {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
        } catch {}
        set({ currentUserId: null, role: null, user: null });
      },

      updateProfile: async (data) => {
        try {
          const res = await fetch("/api/auth/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok)
            return { ok: false, error: d?.error || "Saqlashda xatolik" };
          set({
            user: d.user as User,
            role: (d.user as User).role,
            currentUserId: (d.user as User).id,
          });
          return { ok: true };
        } catch {
          return { ok: false, error: "Tarmoq xatosi" };
        }
      },

      theme: "light",
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        applyTheme(next);
        set({ theme: next });
      },
      setTheme: (t) => {
        applyTheme(t);
        set({ theme: t });
      },
    }),
    {
      name: "ts-session",
      // Only the theme is persisted; identity always comes from the server.
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);
