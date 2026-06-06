"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react/dist/ssr";

export function RecordingPlayer({ totalSeconds = 78, seed = 11 }: { totalSeconds?: number; seed?: number }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    function tick() {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      setT((cur) => {
        const next = cur + delta;
        if (next >= totalSeconds) {
          setPlaying(false);
          return totalSeconds;
        }
        return next;
      });
      ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [playing, totalSeconds]);

  const bars = 64;
  const heights = Array.from({ length: bars }, (_, i) => {
    const noise = Math.sin(i * 1.7 + seed) * 0.5 + Math.cos(i * 0.6 + seed * 0.7) * 0.45 + 0.6;
    return Math.max(0.18, Math.min(1, noise));
  });

  const progress = t / totalSeconds;

  return (
    <div className="rounded-card border border-stone bg-porcelain px-3 py-2.5 flex items-center gap-3">
      <button
        onClick={() => setPlaying((p) => !p)}
        className="h-9 w-9 shrink-0 rounded-full bg-peacock text-white flex items-center justify-center hover:bg-peacock-600 transition active:translate-y-px"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <PauseIcon size={14} weight="fill" /> : <PlayIcon size={14} weight="fill" className="translate-x-[1px]" />}
      </button>
      <div className="flex-1 h-9 flex items-center gap-[2px]">
        {heights.map((h, i) => {
          const filled = i / bars <= progress;
          return (
            <motion.span
              key={i}
              animate={{ scaleY: playing ? [h, h * 1.05, h * 0.95, h] : h }}
              transition={
                playing
                  ? { repeat: Infinity, duration: 1.6 + (i % 5) * 0.07, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
              className={
                "flex-1 origin-center rounded-full " +
                (filled ? "bg-peacock" : "bg-stone2")
              }
              style={{ height: `${Math.round(h * 28)}px` }}
            />
          );
        })}
      </div>
      <span className="font-mono tabular-nums text-meta text-ink-500 shrink-0 w-[60px] text-right">
        {Math.floor(t / 60)}:{Math.floor(t % 60).toString().padStart(2, "0")} / {Math.floor(totalSeconds / 60)}:{(totalSeconds % 60).toString().padStart(2, "0")}
      </span>
    </div>
  );
}
