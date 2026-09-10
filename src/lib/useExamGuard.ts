"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ViolationKind } from "@/lib/types";

export type ViolationType = ViolationKind;

interface Options {
  /** Guard faol (imtihon ketyapti) */
  active: boolean;
  /** Har qoida buzilganda chaqiriladi */
  onViolation: (type: ViolationType) => void;
  /** Fullscreen majburiy bo'lsin */
  requireFullscreen?: boolean;
  /** Copy/paste/right-click bloklansin */
  blockCopy?: boolean;
  /** Bir xil imtihonning ikkinchi oynada ochilishini aniqlash uchun kalit */
  examKey?: string;
}

interface Fs extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}
interface Doc extends Document {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitFullscreenEnabled?: boolean;
}

function fsElement(): Element | null {
  const d = document as Doc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? d.msFullscreenElement ?? null;
}

/** Brauzer fullscreen API'ni umuman qo'llab-quvvatlaydimi (iOS Safari — yo'q). */
function fsSupported(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as Doc;
  const el = document.documentElement as Fs;
  return (
    (d.fullscreenEnabled ?? d.webkitFullscreenEnabled ?? false) &&
    !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)
  );
}

/** DevTools / ko'rish manbai / chop etish / yangi oyna klavish birikmalari. */
function isBlockedShortcut(e: KeyboardEvent): boolean {
  const k = e.key.toLowerCase();
  if (k === "f12") return true;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.shiftKey && ["i", "j", "c", "k"].includes(k)) return true;
  if (mod && ["u", "p", "s", "c", "x", "v", "a", "f"].includes(k)) return true;
  // Ctrl+T / Ctrl+N / Ctrl+W ni brauzer o'zi ushlaydi — preventDefault ta'sir
  // qilmasligi mumkin, lekin urinishning o'zi qayd etiladi.
  if (mod && ["t", "n", "w"].includes(k)) return true;
  return false;
}

/**
 * Imtihon "qo'riqchisi".
 *
 * Nimalarni qayd etadi: tab/oyna almashish (`blur`), fullscreen'dan chiqish
 * (`fullscreen`), nusxa-joylashtirish (`copy`), taqiqlangan klavish birikmasi
 * (`shortcut`), imtihonning ikkinchi oynada ochilishi (`second-window`) va
 * chop etishga urinish (`print`).
 *
 * Avto-topshirish qarori chaqiruvchida (ExamRunner) — bu hook faqat aniqlaydi.
 */
export function useExamGuard({
  active,
  onViolation,
  requireFullscreen = true,
  blockCopy = true,
  examKey,
}: Options) {
  const [fullscreen, setFullscreen] = useState(false);
  const [supported, setSupported] = useState(true);
  const lastAt = useRef(0);

  // qisqa vaqt ichidagi takroriy signal (blur + visibility) bir marta sanaladi
  const fire = useCallback(
    (type: ViolationType) => {
      const now = Date.now();
      if (now - lastAt.current < 900) return;
      lastAt.current = now;
      onViolation(type);
    },
    [onViolation]
  );

  const requestFullscreen = useCallback(async () => {
    const el = document.documentElement as Fs;
    try {
      if (el.requestFullscreen)
        await el.requestFullscreen({ navigationUI: "hide" });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) await el.msRequestFullscreen();
    } catch {
      /* foydalanuvchi rad etsa — jimgina davom etamiz */
    }
    setFullscreen(!!fsElement());
  }, []);

  const exitFullscreen = useCallback(async () => {
    const d = document as Doc;
    try {
      if (!fsElement()) return;
      if (d.exitFullscreen) await d.exitFullscreen();
      else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
      else if (d.msExitFullscreen) await d.msExitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    setSupported(fsSupported());
    setFullscreen(!!fsElement());

    const onVisibility = () => {
      if (document.visibilityState === "hidden") fire("blur");
    };
    const onBlur = () => fire("blur");
    const onFsChange = () => {
      const on = !!fsElement();
      setFullscreen(on);
      if (!on && requireFullscreen) fire("fullscreen");
    };
    const block = (e: Event) => {
      e.preventDefault();
      return false;
    };
    const onClipboard = (e: Event) => {
      e.preventDefault();
      fire("copy");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isBlockedShortcut(e)) return;
      e.preventDefault();
      e.stopPropagation();
      fire("shortcut");
    };
    const onPrint = () => fire("print");
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("beforeprint", onPrint);
    document.addEventListener("keydown", onKeyDown, true);
    if (blockCopy) {
      document.addEventListener("copy", onClipboard);
      document.addEventListener("cut", onClipboard);
      document.addEventListener("paste", onClipboard);
      document.addEventListener("contextmenu", block);
      document.addEventListener("selectstart", block);
      document.addEventListener("dragstart", block);
    }

    // Ikkinchi oyna/tab: bir xil imtihon boshqa oynada ochilsa, ikkalasi ham
    // xabar oladi va bu qayd etiladi.
    let channel: BroadcastChannel | null = null;
    if (examKey && typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(`exam-${examKey}`);
        channel.onmessage = (ev: MessageEvent) => {
          if (ev.data === "hello") {
            channel?.postMessage("here");
            fire("second-window");
          } else if (ev.data === "here") {
            fire("second-window");
          }
        };
        channel.postMessage("hello");
      } catch {
        channel = null;
      }
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("MSFullscreenChange", onFsChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("beforeprint", onPrint);
      document.removeEventListener("keydown", onKeyDown, true);
      if (blockCopy) {
        document.removeEventListener("copy", onClipboard);
        document.removeEventListener("cut", onClipboard);
        document.removeEventListener("paste", onClipboard);
        document.removeEventListener("contextmenu", block);
        document.removeEventListener("selectstart", block);
        document.removeEventListener("dragstart", block);
      }
      channel?.close();
    };
  }, [active, fire, requireFullscreen, blockCopy, examKey]);

  return { fullscreen, supported, requestFullscreen, exitFullscreen };
}
