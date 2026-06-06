"use client";

import { motion } from "framer-motion";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import type { ScoredCandidate } from "@/lib/types";

export function CandidateScoreBreakdown({ candidate }: { candidate: ScoredCandidate }) {
  return (
    <div className="rounded-card border border-stone bg-porcelain p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink-400 font-[700] mb-2">
        {candidate.blocks.length ? "Why this customer was skipped" : `Why this customer is ranked`}
      </div>
      <ul className="space-y-1.5">
        {candidate.blocks.length === 0
          ? candidate.reasons.map((r, i) => (
              <motion.li
                key={r + i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-2 text-[13px]"
              >
                <CheckCircleIcon size={13} weight="fill" className="text-vert-600 mt-0.5" />
                <span className="text-ink">{r}</span>
              </motion.li>
            ))
          : candidate.blocks.map((b, i) => (
              <motion.li
                key={b + i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-2 text-[13px]"
              >
                <XCircleIcon size={13} weight="fill" className="text-sienna-600 mt-0.5" />
                <span className="text-ink">{b}</span>
              </motion.li>
            ))}
      </ul>
    </div>
  );
}
