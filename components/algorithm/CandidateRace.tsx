"use client";

import { motion } from "framer-motion";
import { TrophyIcon } from "@phosphor-icons/react/dist/ssr";
import type { AlgorithmExplanation } from "@/lib/algo/types";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const STATUS_TONE: Record<AlgorithmExplanation["status"], { bg: string; fg: string; label: string }> = {
  call_now: { bg: "bg-vert-100", fg: "text-vert-700", label: "Call now" },
  call_later: { bg: "bg-peacock-50", fg: "text-peacock-700", label: "Call next" },
  blocked: { bg: "bg-sienna-100", fg: "text-sienna-700", label: "Blocked" },
  travel_blocked: { bg: "bg-sienna-50", fg: "text-sienna-700", label: "Travel blocked" },
  needs_review: { bg: "bg-saffron-100", fg: "text-saffron-700", label: "Needs review" }
};

export function CandidateRace({
  candidates,
  selectedId,
  onSelect
}: {
  candidates: AlgorithmExplanation[];
  selectedId?: string;
  onSelect: (customerId: string) => void;
}) {
  const ordered = [...candidates].sort((a, b) => {
    if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;
    return a.customerName.localeCompare(b.customerName);
  });

  return (
    <div className="rounded-card bg-white shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrophyIcon size={16} weight="duotone" className="text-saffron-600" />
        <h3 className="text-section">Candidate race</h3>
        <span className="ml-auto text-meta text-ink-400">{ordered.length} candidates</span>
      </div>
      <ul className="space-y-2">
        {ordered.map((c, i) => {
          const tone = STATUS_TONE[c.status];
          const active = c.customerId === selectedId;
          return (
            <motion.li
              key={c.customerId}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <button
                onClick={() => onSelect(c.customerId)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-btn border transition text-left",
                  active ? "border-peacock bg-peacock-50/40" : "border-transparent hover:bg-porcelain2"
                )}
              >
                <span className="font-mono text-meta text-ink-400 tabular-nums w-5 text-right">
                  {i + 1}
                </span>
                <span className="h-8 w-8 rounded-full bg-gradient-to-br from-violet to-peacock text-white flex items-center justify-center font-[700] text-[11px]">
                  {initials(c.customerName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-[650] truncate">{c.customerName}</span>
                    {c.source === "upgrade" && (
                      <span className="px-1.5 py-0.5 rounded-chip bg-violet-50 text-violet-700 text-[10.5px] font-[700]">
                        Upgrade
                      </span>
                    )}
                  </div>
                  <div className="text-meta text-ink-500 truncate">
                    {c.status === "travel_blocked"
                      ? `${c.route.travelMinutes}m drive vs ${c.route.timeLeftMinutes}m left`
                      : c.reasons[0] ?? "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono tabular-nums text-[18px] font-[700]">
                    {c.finalScore.toFixed(0)}
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-chip text-[10.5px] font-[700] uppercase tracking-wider", tone.bg, tone.fg)}>
                    {tone.label}
                  </span>
                </div>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
