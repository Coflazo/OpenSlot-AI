"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PauseIcon, EyeIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { useStore } from "@/lib/store";
import { money, shortDate, duration } from "@/lib/format";
import { StatusChip } from "./StatusChip";
import { TimeLeftPill } from "./TimeLeftPill";
import { Button } from "../primitives/button";

export function OpenSlotCard({ slotId }: { slotId: string }) {
  const slot = useStore((s) => s.slots.find((x) => x.id === slotId));
  const allCalls = useStore((s) => s.calls);
  const calls = useMemo(() => allCalls.filter((c) => c.slotId === slotId), [allCalls, slotId]);
  const setActive = useStore((s) => s.setActiveSlot);
  const pauseSlot = useStore((s) => s.pauseSlot);

  if (!slot) return null;
  const activeCall = calls.find((c) => c.status === "ringing" || c.status === "in_progress");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      className="bg-white rounded-card shadow-card p-5 relative overflow-hidden"
    >
      <div className="absolute inset-y-0 left-0 w-[3px] bg-peacock" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-section">{slot.service}</h3>
            <StatusChip status={slot.status} pulse />
          </div>
          <div className="text-meta text-ink-500 flex items-center gap-3 flex-wrap">
            <span>{shortDate(slot.startTime)}</span>
            <span className="h-1 w-1 rounded-full bg-stone2" />
            <span>{duration(slot.durationMinutes)}</span>
            <span className="h-1 w-1 rounded-full bg-stone2" />
            <span className="truncate max-w-[280px]">{slot.location}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[600]">Value</div>
          <div className="text-[20px] font-[700] font-mono text-saffron-600 tabular-nums">
            {money(slot.estimatedValue)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <TimeLeftPill iso={slot.startTime} />
        {activeCall && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-chip text-[11.5px] font-[600] bg-peacock-50 text-peacock-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-peacock opacity-50 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-peacock" />
            </span>
            Calling candidate {calls.length} of 7
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/open-slots?id=${slot.id}`} onClick={() => setActive(slot.id)}>
            <EyeIcon size={13} />
            View workflow
            <ArrowRightIcon size={11} className="ml-0.5" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-sienna-600 hover:bg-sienna-50"
          onClick={() => pauseSlot(slot.id)}
        >
          <PauseIcon size={12} />
          Pause calls
        </Button>
      </div>
    </motion.div>
  );
}
