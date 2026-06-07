"use client";

import { motion } from "framer-motion";
import { StackIcon } from "@phosphor-icons/react/dist/ssr";
import type { AlgorithmExplanation } from "@/lib/algo/types";
import { palette } from "@/lib/design/tokens";

const ROWS: { key: keyof AlgorithmExplanation["weightedContributions"]; label: string; color: string; negative?: boolean }[] = [
  { key: "eligibilityFit", label: "Eligibility", color: palette.vert },
  { key: "urgency", label: "Urgency", color: palette.sienna },
  { key: "waitTime", label: "Wait time", color: "#7C80A2" },
  { key: "pickupProbability", label: "Pickup", color: palette.peacock },
  { key: "businessPriority", label: "Business priority", color: palette.violet },
  { key: "preferenceMatch", label: "Preference", color: "#5DA77C" },
  { key: "travelFeasibility", label: "Travel feasibility", color: palette.saffron },
  { key: "cooldownPenalty", label: "Cooldown penalty", color: "#AE5224", negative: true }
];

export function ScoreStack({ candidate }: { candidate: AlgorithmExplanation }) {
  const positiveTotal = ROWS.filter((r) => !r.negative).reduce(
    (sum, r) => sum + candidate.weightedContributions[r.key],
    0
  );
  const penalty = candidate.weightedContributions.cooldownPenalty;
  const showMax = Math.max(1, positiveTotal);

  return (
    <div className="rounded-card bg-white shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <StackIcon size={16} weight="duotone" className="text-peacock" />
        <h3 className="text-section">Score breakdown · {candidate.customerName}</h3>
        <span className="ml-auto font-mono tabular-nums text-[18px] font-[700]">
          {candidate.finalScore.toFixed(1)}
        </span>
      </div>

      <div className="space-y-2">
        {ROWS.map((r) => {
          const raw = candidate.weightedContributions[r.key];
          const widthPct = Math.round((raw / showMax) * 100);
          return (
            <div key={r.key}>
              <div className="flex items-baseline justify-between mb-0.5 text-[12px]">
                <span className={r.negative ? "text-sienna-700 font-[600]" : "text-ink-600 font-[600]"}>
                  {r.negative ? "−" : ""}
                  {r.label}
                </span>
                <span className="font-mono tabular-nums text-ink-400">
                  {(candidate.scoreParts[r.key] * 100).toFixed(0)}% × weight
                </span>
              </div>
              <div className="h-2.5 w-full bg-porcelain2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.abs(widthPct)}%` }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="h-full rounded-full"
                  style={{ background: r.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-stone/70 grid grid-cols-3 text-meta">
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700]">Positives</div>
          <div className="font-mono tabular-nums text-[14px] font-[700] text-vert-700">
            +{(positiveTotal * 100).toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700]">Penalty</div>
          <div className="font-mono tabular-nums text-[14px] font-[700] text-sienna-700">
            −{(penalty * 100).toFixed(1)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] uppercase tracking-wider text-ink-400 font-[700]">Final</div>
          <div className="font-mono tabular-nums text-[14px] font-[700]">{candidate.finalScore.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}
