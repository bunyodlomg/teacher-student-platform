"use client";

import { cn } from "@/lib/utils";
import { Mic, Send, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Telegram-style voice recorder. Idle: a round mic button. Recording: a red
 * live bar with a pulsing dot, timer, a moving level waveform, plus cancel
 * (trash) and send (paper-plane) actions. Calls onRecorded(file) on send.
 */
export function VoiceRecorder({
  onRecorded,
  className,
}: {
  onRecorded: (file: File) => void;
  className?: string;
}) {
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [error, setError] = useState("");

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    streamRef.current = null;
    setRecording(false);
  };

  const start = async () => {
    setError("");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Brauzer ovoz yozishni qo'llab-quvvatlamaydi");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        cleanup();
        if (cancelledRef.current) return;
        const type = rec.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        const stamp = new Date()
          .toLocaleTimeString("uz-UZ")
          .replace(/:/g, "-");
        onRecorded(new File([blob], `ovozli-xabar-${stamp}.${ext}`, { type }));
      };

      // live level meter
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const srcNode = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      srcNode.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (const v of data) sum += v;
        const avg = sum / data.length / 255;
        setLevels((prev) => [...prev.slice(-47), Math.max(0.08, avg)]);
        rafRef.current = requestAnimationFrame(tick);
      };

      rec.start();
      setRecording(true);
      setSeconds(0);
      setLevels([]);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      tick();
    } catch {
      setError("Mikrofonga ruxsat berilmadi");
    }
  };

  const send = () => {
    cancelledRef.current = false;
    recRef.current?.stop();
  };
  const cancel = () => {
    cancelledRef.current = true;
    recRef.current?.stop();
    setSeconds(0);
    setLevels([]);
  };

  if (!recording) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={start}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-bg/40 px-3 py-2.5 text-[13px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-ink"
        >
          <Mic className="h-4 w-4" /> Ovozli xabar yozish
        </button>
        {error && (
          <p className="mt-2 text-[12px] font-medium text-danger">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-danger/30 bg-danger/5 px-2 py-2",
        className
      )}
    >
      <button
        type="button"
        onClick={cancel}
        aria-label="Bekor qilish"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-danger transition-colors hover:bg-danger/10"
      >
        <Trash2 className="h-5 w-5" />
      </button>

      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
      </span>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-danger">
        {mmss(seconds)}
      </span>

      <div className="flex h-8 flex-1 items-center justify-end gap-[2px] overflow-hidden">
        {levels.map((l, i) => (
          <span
            key={i}
            style={{ height: `${Math.max(14, l * 100)}%` }}
            className="w-[3px] shrink-0 rounded-full bg-danger/60"
          />
        ))}
      </div>

      <button
        type="button"
        onClick={send}
        aria-label="Yuborish"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-glow-accent transition-transform active:scale-95"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
}
