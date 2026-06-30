"use client";

import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import { useMemo, useRef, useState } from "react";

const BARS = 36;

/** Auto-generated recordings get a friendly label instead of a file name. */
function friendlyName(name?: string) {
  if (!name) return undefined;
  if (/^ovozli-xabar/i.test(name)) return "Ovozli xabar";
  return name.replace(/\.[a-z0-9]+$/i, ""); // drop extension
}

function mmss(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Deterministic fallback waveform from the url (so it looks stable per file). */
function pseudoWave(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < BARS; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    out.push(0.25 + (h % 1000) / 1000 * 0.7);
  }
  return out;
}

/**
 * Telegram-style voice message: round play/pause, a seekable waveform whose
 * played portion is highlighted, elapsed/total time and a playback-speed chip.
 */
export function VoiceMessage({
  src,
  name,
  className,
}: {
  src: string;
  name?: string;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  // a lightweight deterministic waveform (avoids fetching + decoding the file)
  const peaks = useMemo(() => pseudoWave(src), [src]);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  };

  // webm from MediaRecorder often reports Infinity duration until nudged
  const fixDuration = (el: HTMLAudioElement) => {
    if (el.duration === Infinity || isNaN(el.duration)) {
      el.currentTime = 1e101;
      const onT = () => {
        el.removeEventListener("timeupdate", onT);
        el.currentTime = 0;
        setDur(el.duration);
      };
      el.addEventListener("timeupdate", onT);
    } else {
      setDur(el.duration);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.currentTime = Math.min(dur, Math.max(0, (e.clientX - r.left) / r.width) * dur);
  };

  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const progress = dur ? cur / dur : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-accent/15 bg-accent-soft/50 px-3 py-2.5",
        className
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-glow-accent transition-transform active:scale-95"
        aria-label={playing ? "To'xtatish" : "Ijro etish"}
      >
        {playing ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 translate-x-[1px] fill-current" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          onClick={seek}
          className="flex h-8 cursor-pointer items-center gap-[2px] overflow-hidden"
        >
          {peaks.map((p, i) => {
            const active = i / BARS <= progress;
            return (
              <span
                key={i}
                style={{ height: `${Math.max(14, p * 100)}%` }}
                className={cn(
                  "w-[3px] shrink-0 rounded-full transition-colors",
                  active ? "bg-accent" : "bg-accent/25"
                )}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
          <span className="shrink-0 tabular-nums">
            {mmss(playing || cur > 0 ? cur : dur)}
          </span>
          {friendlyName(name) && (
            <span className="truncate">· {friendlyName(name)}</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={cycleRate}
        className="shrink-0 rounded-full bg-surface px-2 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-elevated"
        aria-label="Tezlik"
      >
        {rate}x
      </button>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => fixDuration(e.currentTarget)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(e) => {
          setPlaying(false);
          setCur(0);
          e.currentTarget.currentTime = 0;
        }}
      />
    </div>
  );
}
