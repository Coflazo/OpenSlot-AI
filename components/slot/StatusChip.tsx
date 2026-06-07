"use client";

import { cn } from "@/lib/cn";
import { statusColor } from "@/lib/design/tokens";
import type { SlotStatus } from "@/lib/types";

export function StatusChip({
  status,
  className,
  pulse
}: {
  status: SlotStatus;
  className?: string;
  pulse?: boolean;
}) {
  const c = statusColor[status as keyof typeof statusColor] ?? statusColor.booked;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-[11.5px] font-[650]", className)}
      style={{ background: c.bg, color: c.fg }}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full")}
        style={{ background: c.ring, boxShadow: pulse ? `0 0 0 0 ${c.ring}80` : undefined }}
      />
      {c.label}
    </span>
  );
}
