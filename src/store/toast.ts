"use client";

import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: string) => void;
}

let seq = 0;

export const useToast = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (tone, message) => {
    const id = `t${Date.now()}_${seq++}`;
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }));
    setTimeout(() => get().dismiss(id), 3800);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Komponentdan tashqarida ham chaqirsa bo'ladigan qulay yordamchi. */
export const toast = {
  success: (m: string) => useToast.getState().push("success", m),
  error: (m: string) => useToast.getState().push("error", m),
  info: (m: string) => useToast.getState().push("info", m),
};
