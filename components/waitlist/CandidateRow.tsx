"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PhoneCallIcon, EyeIcon, SkipForwardIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { useStore } from "@/lib/store";
import { initials, shortDate } from "@/lib/format";
import { Button } from "../primitives/button";
import { Badge } from "../primitives/badge";
import { cn } from "@/lib/cn";
import type { ScoredCandidate } from "@/lib/types";

const ringByScore = (score: number) =>
  score >= 80 ? "ring-vert-300" : score >= 60 ? "ring-saffron-200" : score >= 30 ? "ring-stone2" : "ring-sienna-200";

export function CandidateRow({
  candidate,
  rank,
  onSelect,
  selected
}: {
  candidate: ScoredCandidate;
  rank: number;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const customer = useStore((s) => s.customers.find((c) => c.id === candidate.customerId));
  if (!customer) return null;
  const isBlocked = candidate.blocks.length > 0;

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cn(
        "w-full text-left flex items-center gap-4 p-3 rounded-card bg-white border border-transparent hover:border-stone transition",
        selected && "border-peacock-200 bg-peacock-50/40",
        isBlocked && "opacity-70"
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center font-[700] text-[12px] bg-gradient-to-br from-violet to-peacock text-white ring-2",
          ringByScore(candidate.score)
        )}
      >
        {initials(customer.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-[650] text-ink truncate">{customer.name}</span>
          {candidate.source === "upgrade" && (
            <Badge tone="violet">Upgrade</Badge>
          )}
          {isBlocked && <Badge tone="sienna">Blocked</Badge>}
        </div>
        <div className="text-meta text-ink-500 flex items-center gap-3 flex-wrap mt-0.5">
          <span>{customer.requestedService ?? "-"}</span>
          {customer.waitingSince && (
            <span className="text-ink-400">Waiting since {shortDate(customer.waitingSince)}</span>
          )}
          {customer.currentBookingId && (
            <span className="text-violet-600">Currently booked</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700]">Score</div>
        <div className="font-mono tabular-nums text-[18px] font-[700] text-ink">
          {candidate.score.toFixed(0)}
        </div>
      </div>
      <span className="hidden md:inline-flex items-center text-meta font-mono text-ink-400 tabular-nums">
        #{rank}
      </span>
    </motion.button>
  );
}
