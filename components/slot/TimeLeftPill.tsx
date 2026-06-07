"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr";
import { timeLeft } from "@/lib/format";
import { cn } from "@/lib/cn";

export function TimeLeftPill({ iso, className }: { iso: string; className?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const { label, minutes } = timeLeft(iso);
  const tone =
    minutes <= 30
      ? "bg-sienna-50 text-sienna-700"
      : minutes <= 120
        ? "bg-saffron-100 text-saffron-700"
        : "bg-porcelain2 text-ink-500";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-chip text-[11.5px] font-[600] tabular-nums",
        tone,
        className
      )}
    >
      <ClockIcon size={11} weight={minutes <= 30 ? "fill" : "regular"} />
      {label}
    </span>
  );
}
