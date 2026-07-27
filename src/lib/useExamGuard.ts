"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ViolationType = "blur" | "fullscreen" | "copy";

interface Options {
  /** Guard faol (imtihon ketyapti) */
  active: boolean;
  /** Har qoida buzilganda chaqiriladi */
  onViolation: (type: ViolationType) => void;
  /** Fullscreen majburiy bo'lsin */
  requireFullscreen?: boolean;
  /** Copy/paste/right-click bloklansin */
  blockCopy?: boolean;
}

interface Fs extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}
interface Doc extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

function fsElement(): Element | null {
  const d = document as Doc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

/**
 * Imtihon "qo'riqchisi": tab/oyna almashishini sanaydi, fullscreen'ni ushlab
 * turadi va nusxa-joylashtirishni bloklaydi. Avto-topshirish YO'Q — faqat qayd
 * etadi va ogohlantiradi (o'rta darajali anti-cheat).
 */
export function useExamGuard({
  active,
  onViolation,
  requireFullscreen = true,
  blockCopy = true,
}: Options) {
  const [fullscreen, setFullscreen] = useState(false);
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
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* foydalanuvchi rad etsa — jimgina davom etamiz */
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const d = document as Doc;
    try {
      if (d.exitFullscreen && fsElement()) await d.exitFullscreen();
      else if (d.webkitExitFullscreen && fsElement()) await d.webkitExitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!active) return;

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
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    if (blockCopy) {
      document.addEventListener("copy", block);
      document.addEventListener("cut", block);
      document.addEventListener("paste", block);
      document.addEventListener("contextmenu", block);
      document.addEventListener("selectstart", block);
    }

    setFullscreen(!!fsElement());

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (blockCopy) {
        document.removeEventListener("copy", block);
        document.removeEventListener("cut", block);
        document.removeEventListener("paste", block);
        document.removeEventListener("contextmenu", block);
        document.removeEventListener("selectstart", block);
      }
    };
  }, [active, fire, requireFullscreen, blockCopy]);

  return { fullscreen, requestFullscreen, exitFullscreen };
}
