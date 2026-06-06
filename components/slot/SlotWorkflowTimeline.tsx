"use client";

import { motion } from "framer-motion";
import { CheckCircleIcon, CircleIcon, DotOutlineIcon } from "@phosphor-icons/react/dist/ssr";
import { useStore } from "@/lib/store";

const STAGES = [
  "Cancellation detected",
  "Eligibility filters applied",
  "Candidates ranked",
  "Call sequence started",
  "Candidate accepted",
  "Booking confirmed",
  "Confirmation sent"
];

export function SlotWorkflowTimeline({ slotId }: { slotId: string }) {
  const slot = useStore((s) => s.slots.find((x) => x.id === slotId));
  const calls = useStore((s) => s.calls.filter((c) => c.slotId === slotId));

  if (!slot) return null;
  const reached = (() => {
    if (slot.status === "booked") return 0;
    let i = 1; // cancellation detected
    if (calls.length === 0) return Math.min(i + 1, STAGES.length);
    i = 4;
    if (calls.some((c) => c.status === "accepted")) i = 7;
    else if (calls.some((c) => c.status === "in_progress" || c.status === "ringing")) i = 4;
    return i;
  })();

  return (
    <ol className="space-y-2">
      {STAGES.map((stage, idx) => {
        const done = idx < reached;
        const active = idx === reached;
        return (
          <motion.li
            key={stage}
            layout
            className="flex items-center gap-3 text-[13.5px]"
          >
            <span
              className={
                done
                  ? "text-vert-600"
                  : active
                    ? "text-peacock"
                    : "text-ink-300"
              }
            >
              {done ? (
                <CheckCircleIcon size={16} weight="fill" />
              ) : active ? (
                <DotOutlineIcon size={16} weight="fill" className="animate-pulse-ring rounded-full" />
              ) : (
                <CircleIcon size={16} />
              )}
            </span>
            <span className={done ? "text-ink" : active ? "text-ink font-[600]" : "text-ink-400"}>
              {stage}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
